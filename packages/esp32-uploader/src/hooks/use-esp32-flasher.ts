/**
 * ESP32 Flasher Hook
 * Manages firmware flashing state and orchestrates the flashing process.
 */

import { useState, useCallback, useRef } from "react";
import { notification } from "antd";
import { serialStreamManager } from "../utils/serial-stream-manager";
import { flashFirmwareWithESPTool } from "../utils/esptool-wrapper";
import {
  getAvailableFirmwares,
  filterFirmwaresByChip,
  downloadFirmware,
  verifyFirmwareChecksum,
  translateFlasherError,
  estimateFlashTime,
} from "../utils/flasher-helper";
import type {
  ChipInfo,
  FirmwareImage,
  FlasherState,
  FlasherPhase,
} from "../types/esp32";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UseESP32FlasherOptions {
  onStatusUpdate?: (status: string) => void;
  onError?: (error: string) => void;
  onProgressUpdate?: (progress: number) => void;
}

export interface FlashStartOptions {
  eraseBeforeFlash?: boolean;
  createBackupFirst?: boolean;
  autoResetAfter?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getChipFeatures(chipFamily: string): string[] {
  switch (chipFamily) {
    case "ESP32":    return ["WiFi", "BT", "BLE"];
    case "ESP32-S2": return ["WiFi"];
    case "ESP32-S3": return ["WiFi", "BLE"];
    case "ESP32-C3": return ["WiFi", "BLE"];
    case "ESP32-C6": return ["WiFi", "BLE", "Thread"];
    case "ESP32-H2": return ["BLE", "Thread"];
    default:         return ["WiFi"];
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useESP32Flasher(serialPort: any, options?: UseESP32FlasherOptions) {
  const [state, setState] = useState<FlasherState>({
    phase: "idle",
    isFlashing: false,
    isRecoveryMode: false,
    progress: 0,
    estimatedTimeRemaining: 0,
    currentOperation: "Ready",
    error: null,
    chipInfo: null,
    selectedFirmware: null,
    customFirmwareBinary: null,
    customFirmwareName: null,
    backupBinary: null,
    operationLog: [],
  });

  const flashStartTimeRef = useRef<number | null>(null);


  // ── Logging ────────────────────────────────────────────────────────────

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setState((prev) => ({
      ...prev,
      operationLog: [...prev.operationLog.slice(-49), `[${timestamp}] ${message}`],
    }));
  }, []);

  // ── Status Updates ─────────────────────────────────────────────────────

  // silent=true: update UI state + log only, do NOT bubble to parent (avoids notification spam during flash)
  const updateStatus = useCallback(
    (message: string, phase?: FlasherPhase, silent = false) => {
      setState((prev) => ({
        ...prev,
        currentOperation: message,
        ...(phase && { phase }),
      }));
      if (!silent) options?.onStatusUpdate?.(message);
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

      const features = getChipFeatures(chipInfo.chipFamily);

      setState((prev) => ({
        ...prev,
        isRecoveryMode: false,
        chipInfo: {
          chipId: chipInfo.chipId,
          chipFamily: chipInfo.chipFamily,
          chipModel: chipInfo.chipFamily,
          revision: chipInfo.revision,
          features,
        },
      }));

      addLog(`Current firmware: ${version}`);
      updateStatus(`Detected: ${chipInfo.chipFamily} (${chipInfo.chipId})`, "idle");

      return {
        chipId: chipInfo.chipId,
        chipFamily: chipInfo.chipFamily,
        chipModel: chipInfo.chipFamily,
        revision: chipInfo.revision,
        features,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      reportError(`Chip detection failed: ${errorMsg}`);
      return null;
    }
  }, [serialPort, updateStatus, reportError, addLog]);

  // ── Recovery Mode ──────────────────────────────────────────────────────
  // Bypasses REPL-based detection when firmware is crashed/missing.
  // esptool-js will talk to the ROM bootloader directly during flash.

  const enterRecoveryMode = useCallback(
    (chipFamily: string = "ESP32") => {
      const features = getChipFeatures(chipFamily);
      setState((prev) => ({
        ...prev,
        isRecoveryMode: true,
        chipInfo: {
          chipId: "N/A (recovery)",
          chipFamily,
          chipModel: chipFamily,
          revision: 0,
          features,
        },
        error: null,
        phase: "idle",
      }));
      addLog(`Recovery mode: chip set to ${chipFamily} (skipping REPL detection)`);
      updateStatus(`Recovery mode active (${chipFamily})`, "idle");
    },
    [addLog, updateStatus]
  );

  // ── Select Firmware ────────────────────────────────────────────────────

  const getCompatibleFirmwares = useCallback((): FirmwareImage[] => {
    if (!state.chipInfo) return getAvailableFirmwares();
    return filterFirmwaresByChip(getAvailableFirmwares(), state.chipInfo.chipFamily);
  }, [state.chipInfo]);

  const selectFirmware = useCallback((firmware: FirmwareImage) => {
    setState((prev) => ({
      ...prev,
      selectedFirmware: firmware,
      customFirmwareBinary: null,
      customFirmwareName: null,
      error: null,
    }));
    addLog(`Selected firmware: ${firmware.name} (${firmware.version})`);
  }, [addLog]);

  const setLocalFirmware = useCallback(
    (fileName: string, binary: ArrayBuffer) => {
      const chipFamily = state.chipInfo?.chipFamily ?? "ESP32";
      const date = new Date().toISOString().slice(0, 10);

      setState((prev) => ({
        ...prev,
        selectedFirmware: {
          name: `Local: ${fileName}`,
          version: "local",
          url: "local",
          releaseDate: date,
          description: "Local firmware file",
          chipFamily,
        },
        customFirmwareBinary: binary,
        customFirmwareName: fileName,
        error: null,
      }));

      addLog(`Selected local firmware: ${fileName} (${binary.byteLength} bytes)`);
    },
    [state.chipInfo, addLog]
  );

  const clearLocalFirmware = useCallback(() => {
    setState((prev) => ({
      ...prev,
      customFirmwareBinary: null,
      customFirmwareName: null,
      selectedFirmware: null,
    }));
    addLog("Cleared local firmware selection");
  }, [addLog]);

  // ── Download Firmware ──────────────────────────────────────────────────

  const downloadSelectedFirmware = useCallback(async (): Promise<ArrayBuffer | null> => {
    if (!state.selectedFirmware) {
      reportError("No firmware selected");
      return null;
    }

    try {
      if (state.customFirmwareBinary) {
        updateStatus("Using local firmware file...", "idle");
        setState((prev) => ({ ...prev, progress: 100 }));
        options?.onProgressUpdate?.(100);
        addLog(
          `Loaded local firmware: ${state.customFirmwareName ?? "local"} (${state.customFirmwareBinary.byteLength} bytes)`
        );
        return state.customFirmwareBinary;
      }

      updateStatus("Downloading firmware...", "idle");

      const binary = await downloadFirmware(state.selectedFirmware.url, (loaded, total) => {
        const percent = total > 0 ? (loaded / total) * 100 : 0;
        setState((prev) => ({ ...prev, progress: percent }));
        options?.onProgressUpdate?.(percent);
      });

      if (state.selectedFirmware.checksumSha256) {
        updateStatus("Verifying firmware integrity...", "idle");
        const isValid = await verifyFirmwareChecksum(binary, state.selectedFirmware.checksumSha256);
        if (!isValid) throw new Error("Firmware checksum mismatch - file may be corrupted");
      }

      addLog(`Downloaded: ${binary.byteLength} bytes`);
      return binary;
    } catch (error) {
      reportError(translateFlasherError(error));
      return null;
    }
  }, [
    state.selectedFirmware,
    state.customFirmwareBinary,
    state.customFirmwareName,
    updateStatus,
    reportError,
    options,
    addLog,
  ]);

  // ── Erase Flash (REPL-based filesystem clear) ──────────────────────────
  // NOTE: This removes user files via MicroPython — it is NOT a full sector
  // erase. esptool-js erases sectors as it writes (eraseAll: false).

  const eraseFlash = useCallback(async (): Promise<boolean> => {
    if (!serialPort || !serialStreamManager.isReady()) {
      reportError("Serial port not available");
      return false;
    }

    try {
      updateStatus("Clearing filesystem... This may take 10-30 seconds", "erasing");
      await serialStreamManager.eraseFlash();
      updateStatus("Filesystem cleared", "idle");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      reportError(`Flash erase failed: ${message}`);
      return false;
    }
  }, [serialPort, updateStatus, reportError]);

  // ── Flash Firmware ─────────────────────────────────────────────────────

  const flashFirmware = useCallback(
    async (binary: ArrayBuffer): Promise<boolean> => {
      if (!serialPort || !state.chipInfo) {
        reportError("Serial port or chip info not available");
        return false;
      }

      try {
        setState((prev) => ({ ...prev, isFlashing: true, phase: "flashing" }));
        flashStartTimeRef.current = Date.now();
        const estimatedMs = estimateFlashTime(binary.byteLength) * 1000;

        updateStatus("Releasing serial port for flasher...", "flashing", true);
        addLog("Releasing serial port locks before flash");

        // Release serial manager's reader/writer locks so esptool-js Transport
        // can take full ownership of the SerialPort.
        await serialStreamManager.cleanup();

        try {
          await serialPort.close();
          addLog("Serial port closed — handing to esptool-js");
        } catch (closeErr) {
          addLog(
            `Warning: port close failed: ${closeErr instanceof Error ? closeErr.message : String(closeErr)}`
          );
        }

        updateStatus(
          `Flashing firmware to ${state.chipInfo.chipFamily} (this may take 1-5 minutes)...`,
          "flashing",
          true
        );
        addLog(`Starting flash: ${binary.byteLength} bytes to ${state.chipInfo.chipFamily}`);

        await flashFirmwareWithESPTool(serialPort, binary, state.chipInfo.chipFamily, {
          baudrate: 115200,
          onProgress: (loaded: number, total: number, phase: string) => {
            const progress = total > 0 ? (loaded / total) * 100 : 0;
            const elapsedMs = Date.now() - (flashStartTimeRef.current ?? 0);
            const remainingSeconds = Math.max(0, estimatedMs - elapsedMs) / 1000;

            setState((prev) => ({
              ...prev,
              progress: Math.round(progress),
              estimatedTimeRemaining: Math.ceil(remainingSeconds),
            }));
            options?.onProgressUpdate?.(Math.round(progress));
            updateStatus(
              `${phase === "erasing" ? "Erasing" : "Writing"} firmware... ${Math.round(progress)}% (${loaded}/${total} bytes)`,
              "flashing",
              true
            );
          },
          onLog: (message: string) => {
            addLog(message);
            updateStatus(message, "flashing", true);
          },
          onVerified: () => {
            addLog("MD5 verification passed — firmware on device is valid");
          },
        });

        setState((prev) => ({
          ...prev,
          progress: 100,
          estimatedTimeRemaining: 0,
        }));
        options?.onProgressUpdate?.(100);

        // Brief wait for the reset to complete before re-opening the port for REPL
        updateStatus("Re-establishing serial connection...", "flashing", true);
        await new Promise((resolve) => setTimeout(resolve, 2000));

        try {
          await serialPort.open({ baudRate: 115200 });
          await serialStreamManager.initialize(serialPort);
          addLog("Serial connection re-established");
        } catch (reinitErr) {
          addLog(
            `Note: serial re-init failed — reconnect to use REPL: ${reinitErr instanceof Error ? reinitErr.message : String(reinitErr)}`
          );
        }

        setState((prev) => ({ ...prev, phase: "completed", isFlashing: false }));
        updateStatus("Flash and verification complete", "completed", true);
        return true;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        addLog(`Flash error: ${errorMsg}`);
        reportError(`Flashing failed: ${translateFlasherError(error)}`);
        return false;
      }
    },
    [serialPort, state.chipInfo, reportError, updateStatus, options, addLog]
  );

  // ── Reset Device ───────────────────────────────────────────────────────

  const resetDevice = useCallback(async (): Promise<void> => {
    if (!serialPort || !serialStreamManager.isReady()) return;

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

  const startFlashing = useCallback(
    async (opts?: FlashStartOptions): Promise<void> => {
      if (!state.selectedFirmware) {
        reportError("Please select a firmware first");
        return;
      }

      const doErase = opts?.eraseBeforeFlash ?? true;
      const isRecoveryMode = state.isRecoveryMode;

      try {
        setState((prev) => ({ ...prev, operationLog: [], error: null }));
        addLog("=== Starting flash process ===");

        // Step 1: Download firmware
        const binary = await downloadSelectedFirmware();
        if (!binary) return;

        // Step 2: Clear user files via REPL (skip in recovery mode)
        if (doErase && !isRecoveryMode) {
          const ok = await eraseFlash();
          if (!ok) return;
        } else {
          addLog(
            isRecoveryMode
              ? "Recovery mode: esptool-js will erase sectors during write"
              : "User file clear skipped"
          );
        }

        // Step 3: Flash — MD5 verification happens inside esptool-js session
        // before the chip is reset, so no REPL is needed post-flash.
        const flashSuccess = await flashFirmware(binary);
        if (!flashSuccess) return;

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
    },
    [
      state.selectedFirmware,
      state.isRecoveryMode,
      downloadSelectedFirmware,
      eraseFlash,
      flashFirmware,
      reportError,
      addLog,
    ]
  );

  // ── Cancel Flashing ────────────────────────────────────────────────────

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
    enterRecoveryMode,
    getCompatibleFirmwares,
    selectFirmware,
    setLocalFirmware,
    clearLocalFirmware,
    startFlashing,
    cancelFlashing,
    resetDevice,
  };
}
