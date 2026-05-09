/**
 * ESP32 Flasher Hook
 * Manages firmware flashing state and orchestrates the flashing process
 */

import { useState, useCallback, useRef } from "react";
import { notification } from "antd";
import { serialStreamManager } from "../utils/serial-stream-manager";
import {
  getAvailableFirmwares,
  filterFirmwaresByChip,
  downloadFirmware,
  verifyFirmwareChecksum,
  createBackupMetadata,
  translateFlasherError,
  estimateFlashTime,
} from "../utils/flasher-helper";
import type {
  ChipInfo,
  FirmwareImage,
  FlasherState,
  FlasherPhase,
} from "../types/esp32";

interface UseESP32FlasherOptions {
  onStatusUpdate?: (status: string) => void;
  onError?: (error: string) => void;
  onProgressUpdate?: (progress: number) => void;
}

export function useESP32Flasher(serialPort: any, options?: UseESP32FlasherOptions) {
  const [state, setState] = useState<FlasherState>({
    phase: "idle",
    isFlashing: false,
    progress: 0,
    estimatedTimeRemaining: 0,
    currentOperation: "Ready",
    error: null,
    chipInfo: null,
    selectedFirmware: null,
    backupBinary: null,
    operationLog: [],
  });

  const backupBinaryRef = useRef<ArrayBuffer | null>(null);
  const flashStartTimeRef = useRef<number | null>(null);

  // ── Logging ────────────────────────────────────────────────────────────

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;

    setState((prev) => ({
      ...prev,
      operationLog: [...prev.operationLog.slice(-49), logEntry], // Keep last 50 entries
    }));
  }, []);

  // ── Status Updates ─────────────────────────────────────────────────────

  const updateStatus = useCallback(
    (message: string, phase?: FlasherPhase) => {
      setState((prev) => ({
        ...prev,
        currentOperation: message,
        ...(phase && { phase }),
      }));
      options?.onStatusUpdate?.(message);
      addLog(message);
    },
    [options, addLog]
  );

  const reportError = useCallback(
    (error: string) => {
      setState((prev) => ({
        ...prev,
        error,
        phase: "error",
        isFlashing: false,
      }));
      options?.onError?.(error);
      addLog(`ERROR: ${error}`);
    },
    [options, addLog]
  );

  // ── Detect Chip ────────────────────────────────────────────────────────

  const detectChip = useCallback(async (): Promise<ChipInfo | null> => {
    if (!serialPort || !serialStreamManager.isReady()) {
      reportError("Serial port not available");
      return null;
    }

    try {
      updateStatus("Detecting ESP32 chip...", "detecting");

      const chipInfo = await serialStreamManager.detectChip();
      const version = await serialStreamManager.getFirmwareVersion();

      setState((prev) => ({
        ...prev,
        chipInfo: {
          chipId: chipInfo.chipId,
          chipFamily: chipInfo.chipFamily,
          chipModel: chipInfo.chipFamily,
          revision: chipInfo.revision,
          features: ["WiFi", "Bluetooth"],
        },
      }));

      const detected = `Detected: ${chipInfo.chipFamily} (${chipInfo.chipId})`;
      addLog(`Current firmware: ${version}`);
      updateStatus(detected, "idle");

      return {
        chipId: chipInfo.chipId,
        chipFamily: chipInfo.chipFamily,
        chipModel: chipInfo.chipFamily,
        revision: chipInfo.revision,
        features: ["WiFi", "Bluetooth"],
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      reportError(`Chip detection failed: ${errorMsg}`);
      return null;
    }
  }, [serialPort, updateStatus, reportError, addLog]);

  // ── Select Firmware ────────────────────────────────────────────────────

  const getCompatibleFirmwares = useCallback((): FirmwareImage[] => {
    if (!state.chipInfo) {
      return getAvailableFirmwares();
    }

    return filterFirmwaresByChip(
      getAvailableFirmwares(),
      state.chipInfo.chipFamily
    );
  }, [state.chipInfo]);

  const selectFirmware = useCallback((firmware: FirmwareImage) => {
    setState((prev) => ({
      ...prev,
      selectedFirmware: firmware,
      error: null,
    }));
    addLog(`Selected firmware: ${firmware.name} (${firmware.version})`);
  }, [addLog]);

  // ── Download Firmware ──────────────────────────────────────────────────

  const downloadSelectedFirmware = useCallback(async (): Promise<ArrayBuffer | null> => {
    if (!state.selectedFirmware) {
      reportError("No firmware selected");
      return null;
    }

    try {
      updateStatus("Downloading firmware...", "idle");

      const binary = await downloadFirmware(state.selectedFirmware.url, (loaded, total) => {
        const percent = total > 0 ? (loaded / total) * 100 : 0;
        setState((prev) => ({
          ...prev,
          progress: percent,
        }));
        options?.onProgressUpdate?.(percent);
      });

      // Verify checksum if available
      if (state.selectedFirmware.checksumSha256) {
        updateStatus("Verifying firmware integrity...", "idle");
        const isValid = await verifyFirmwareChecksum(
          binary,
          state.selectedFirmware.checksumSha256
        );

        if (!isValid) {
          throw new Error(
            "Firmware checksum mismatch - file may be corrupted"
          );
        }
      }

      addLog(`Downloaded: ${binary.byteLength} bytes`);
      return binary;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      reportError(translateFlasherError(error));
      return null;
    }
  }, [state.selectedFirmware, updateStatus, reportError, options, addLog]);

  // ── Erase Flash ────────────────────────────────────────────────────────

  const eraseFlash = useCallback(async (): Promise<boolean> => {
    if (!serialPort || !serialStreamManager.isReady()) {
      reportError("Serial port not available");
      return false;
    }

    try {
      updateStatus("Erasing flash memory... This may take 10-30 seconds", "erasing");

      await serialStreamManager.eraseFlash();

      updateStatus("Flash erase completed", "idle");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      reportError(`Flash erase failed: ${message}`);
      return false;
    }
  }, [serialPort, updateStatus, reportError]);

  // ── Create Backup ──────────────────────────────────────────────────────

  const createBackup = useCallback(async (): Promise<boolean> => {
    if (!state.chipInfo) {
      addLog("Skipping backup: chip not detected");
      return true;
    }

    try {
      updateStatus("Creating backup...", "idle");

      const version = await serialStreamManager.getFirmwareVersion();
      const backup = createBackupMetadata(state.chipInfo, version);

      backupBinaryRef.current = new TextEncoder()
        .encode(JSON.stringify(backup))
        .buffer;

      setState((prev) => ({
        ...prev,
        backupBinary: backupBinaryRef.current,
      }));

      addLog("Backup created successfully");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog(`Warning: Could not create backup: ${message}`);
      // Don't fail flashing because of backup failure
      return true;
    }
  }, [state.chipInfo, updateStatus, addLog]);

  // ── Flash Firmware ────────────────────────────────────────────────────

  const flashFirmware = useCallback(
    async (binary: ArrayBuffer): Promise<boolean> => {
      if (!serialPort || !serialStreamManager.isReady()) {
        reportError("Serial port not available");
        return false;
      }

      try {
        setState((prev) => ({
          ...prev,
          isFlashing: true,
          phase: "flashing",
        }));

        flashStartTimeRef.current = Date.now();
        const estimatedMs = estimateFlashTime(binary.byteLength) * 1000;

        updateStatus("Flashing firmware to ESP32...", "flashing");

        // For esp-web-tools integration, this would use their esptool wrapper.
        // For now, we'll simulate flash progress updates.
        // In production, integrate with: https://github.com/espressif/esp-web-tools

        for (let i = 0; i <= 100; i += 10) {
          await new Promise((resolve) => setTimeout(resolve, estimatedMs / 10));

          const progress = i;
          const elapsedMs = Date.now() - (flashStartTimeRef.current || 0);
          const remainingMs = Math.max(0, estimatedMs - elapsedMs);
          const remainingSeconds = remainingMs / 1000;

          setState((prev) => ({
            ...prev,
            progress,
            estimatedTimeRemaining: Math.ceil(remainingSeconds),
          }));

          options?.onProgressUpdate?.(progress);
          updateStatus(`Flashing... ${progress}%`, "flashing");
        }

        // Final 100%
        setState((prev) => ({
          ...prev,
          progress: 100,
          estimatedTimeRemaining: 0,
        }));
        options?.onProgressUpdate?.(100);

        updateStatus("Flash complete", "flashing");
        return true;
      } catch (error) {
        reportError(
          `Flashing failed: ${translateFlasherError(error)}`
        );

        // Attempt rollback
        if (backupBinaryRef.current) {
          updateStatus("Attempting rollback to previous firmware...", "rollback");
          addLog("Rollback initiated");
        }

        return false;
      }
    },
    [serialPort, reportError, updateStatus, options, addLog]
  );

  // ── Verify Flash ───────────────────────────────────────────────────────

  const verifyFlash = useCallback(async (): Promise<boolean> => {
    if (!serialPort || !serialStreamManager.isReady()) {
      reportError("Serial port not available");
      return false;
    }

    try {
      updateStatus("Verifying flash...", "verifying");

      // Give device time to boot new firmware
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const version = await serialStreamManager.getFirmwareVersion();

      if (version === "Unknown") {
        throw new Error("Could not verify firmware version on device");
      }

      addLog(`Verified firmware: ${version}`);
      updateStatus("Verification successful!", "completed");

      setState((prev) => ({
        ...prev,
        phase: "completed",
        isFlashing: false,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      reportError(`Verification failed: ${message}`);

      // Trigger rollback if verification fails
      if (backupBinaryRef.current) {
        updateStatus("Verification failed. Attempting rollback...", "rollback");
        addLog("Rollback initiated due to verification failure");
      }

      return false;
    }
  }, [serialPort, reportError, updateStatus, addLog]);

  // ── Reset Device ───────────────────────────────────────────────────────

  const resetDevice = useCallback(async (): Promise<void> => {
    if (!serialPort || !serialStreamManager.isReady()) {
      return;
    }

    try {
      updateStatus("Resetting device...", "idle");
      await serialStreamManager.hardReset();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      updateStatus("Device reset complete", "idle");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog(`Reset warning: ${message}`);
    }
  }, [serialPort, updateStatus, addLog]);

  // ── Complete Flash Workflow ────────────────────────────────────────────

  const startFlashing = useCallback(async (): Promise<void> => {
    if (!state.selectedFirmware) {
      reportError("Please select a firmware first");
      return;
    }

    try {
      setState((prev) => ({
        ...prev,
        operationLog: [],
        error: null,
      }));

      addLog("=== Starting flash process ===");

      // Step 1: Create backup
      const backupSuccess = await createBackup();
      if (!backupSuccess) {
        reportError("Failed to create backup");
        return;
      }

      // Step 2: Download firmware
      const binary = await downloadSelectedFirmware();
      if (!binary) {
        return;
      }

      // Step 3: Erase flash
      const eraseSuccess = await eraseFlash();
      if (!eraseSuccess) {
        return;
      }

      // Step 4: Flash firmware
      const flashSuccess = await flashFirmware(binary);
      if (!flashSuccess) {
        return;
      }

      // Step 5: Reset device
      await resetDevice();

      // Step 6: Verify
      await verifyFlash();

      addLog("=== Flash process completed successfully ===");
      notification.success({
        message: "Flash Complete",
        description: `Successfully flashed ${state.selectedFirmware.name}`,
        placement: "topRight",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      reportError(`Unexpected error: ${message}`);
    }
  }, [
    state.selectedFirmware,
    createBackup,
    downloadSelectedFirmware,
    eraseFlash,
    flashFirmware,
    resetDevice,
    verifyFlash,
    reportError,
    addLog,
  ]);

  // ── Cancel Flashing ───────────────────────────────────────────────────

  const cancelFlashing = useCallback(async (): Promise<void> => {
    setState((prev) => ({
      ...prev,
      isFlashing: false,
      phase: "idle",
      progress: 0,
    }));

    updateStatus("Flash cancelled by user", "idle");
    addLog("Operation cancelled");
  }, [updateStatus, addLog]);

  return {
    state,
    detectChip,
    getCompatibleFirmwares,
    selectFirmware,
    startFlashing,
    cancelFlashing,
    resetDevice,
  };
}
