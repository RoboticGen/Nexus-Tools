"use client";

import {
  useESP32Uploader,
  useESP32REPL,
  useESP32Flasher,
  serialStreamManager,
  type SerialPort,
} from "@nexus-tools/esp32-uploader";
import { Trash2, Square as StopIcon } from "lucide-react";
import { useState, useMemo, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from "react";

import { Button } from "@nexus-tools/design-system/components/ui/button";
import { FirmwareFlasher, type FlasherOption, type FlasherState } from "@nexus-tools/design-system/components/ui/firmware-flasher";
import { OutputPanel } from "@nexus-tools/design-system/components/ui/output-panel";
import { ReplConsole } from "@nexus-tools/design-system/components/ui/repl-console";

interface ESP32OutputPanelProps {
  output?: string;
  onClear: () => void;
  onStop: () => void;
  /** Python source uploaded to the device. */
  code?: string;
  onStatusUpdate?: (status: string) => void;
  onError?: (error: string) => void;
  onOpenFileInEditor?: (filename: string, content: string) => void;
  /** Hands the parent a save function once the device is ready. */
  onSaveFileToDevice?: (saveFunc: (filename: string, content: string) => Promise<void>) => void;
  onConnectionStatusChange?: (isConnected: boolean) => void;
  onSerialPortChange?: (serialPort: SerialPort | null) => void;
  className?: string;
}

export interface ESP32OutputPanelHandle {
  connectToDevice: () => void;
  resetConnection: () => void;
}

const REPL_MAX_LINES = 200;

function trimLines(text: string, maxLines: number): string {
  const lines = text.split("\n");
  return lines.length > maxLines ? lines.slice(-maxLines).join("\n") : text;
}

const RECOVERY_CHIP_FAMILIES: FlasherOption[] = [
  { id: "ESP32", label: "ESP32" },
  { id: "ESP32-S2", label: "ESP32-S2" },
  { id: "ESP32-S3", label: "ESP32-S3" },
  { id: "ESP32-C3", label: "ESP32-C3" },
  { id: "ESP32-C6", label: "ESP32-C6" },
  { id: "ESP32-H2", label: "ESP32-H2" },
];

/** Interactive REPL tab. */
function ReplTab({
  serialPort,
  isConnected: parentConnected,
}: {
  serialPort: SerialPort | null;
  isConnected: boolean;
}) {
  const [output, setOutput] = useState("");
  /** The port a handshake completed on, not a boolean: `connected` derives from it, so a dropped or swapped device turns the REPL off without an effect syncing state from props. */
  const [readyPort, setReadyPort] = useState<SerialPort | null>(null);
  const [busy, setBusy] = useState(false);
  const connectingRef = useRef(false);

  const connected = parentConnected && readyPort !== null && readyPort === serialPort;

  const { connectToREPL, executeCommand, sendCtrlC, sendCtrlD, disconnect, isAwaitingContinuation } =
    useESP32REPL(serialPort);

  const push = useCallback((text: string) => {
    setOutput((prev) => trimLines(prev ? `${prev}\n${text}` : text, REPL_MAX_LINES));
  }, []);

  const doConnect = useCallback(async () => {
    if (!serialPort || connectingRef.current) return;
    connectingRef.current = true;
    try {
      // No state written before this await: the effect below calls this on mount, where a synchronous setState is the cascading-render pattern.
      await connectToREPL();
      // A fresh session starts with a clear scrollback, not the last device's.
      setOutput("=== REPL Connected ===\nReady. Type Python commands below.");
      setReadyPort(serialPort);
    } catch (err) {
      setOutput(`Connection failed: ${err instanceof Error ? err.message : String(err)}`);
      setReadyPort(null);
    } finally {
      connectingRef.current = false;
    }
  }, [serialPort, connectToREPL]);

  // Synchronising with an external system (the serial device) is what an effect is for; the rule fires only because it cannot see through the async call.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (serialPort && parentConnected && !connected) doConnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialPort, parentConnected, connected]);

  // `connected` already derives to false when the parent drops the device, so nothing here sets state.
  useEffect(() => {
    if (parentConnected) return;
    connectingRef.current = false;
    disconnect().catch(() => {});
  }, [parentConnected, disconnect]);

  useEffect(() => () => { disconnect().catch(() => {}); }, [disconnect]);

  const handleSend = useCallback(
    async (command: string) => {
      if (!connected || busy) return;
      setBusy(true);
      push(`${isAwaitingContinuation ? "..." : ">>>"} ${command}`);
      try {
        const result = await executeCommand(command);
        if (result.output) push(result.output);
        if (result.error) push(result.error);
      } catch (err) {
        push(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [connected, busy, executeCommand, isAwaitingContinuation, push]
  );

  const handleInterrupt = useCallback(() => {
    sendCtrlC();
    push("^C");
  }, [sendCtrlC, push]);

  const handleSoftReset = useCallback(() => {
    sendCtrlD();
    push("^D Soft reset");
  }, [sendCtrlD, push]);

  if (!serialPort) {
    return <p className="text-muted-foreground text-sm">Connect your ESP32 device to use REPL.</p>;
  }
  if (!connected) {
    return <p className="text-muted-foreground text-sm">Connecting…</p>;
  }

  return (
    <ReplConsole
      output={output}
      continuation={isAwaitingContinuation}
      disabled={busy}
      onSend={handleSend}
      onInterrupt={handleInterrupt}
      onSoftReset={handleSoftReset}
      onClear={() => setOutput("")}
    />
  );
}

/** Firmware flashing tab. */
function FlasherTab({
  serialPort,
  isConnected,
  onStatusUpdate,
  onError,
}: {
  serialPort: SerialPort | null;
  isConnected: boolean;
  onStatusUpdate?: (status: string) => void;
  onError?: (error: string) => void;
}) {
  const flasherOptions = useMemo(
    () => ({ onStatusUpdate, onError, onProgressUpdate: () => {} }),
    [onStatusUpdate, onError]
  );

  const { state, detectChip, enterRecoveryMode, getCompatibleFirmwares, selectFirmware, setLocalFirmware, startFlashing } =
    useESP32Flasher(serialPort, flasherOptions);

  useEffect(() => {
    if (serialPort && isConnected && !state.chipInfo && state.phase !== "detecting") {
      const timer = setTimeout(() => {
        detectChip();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [serialPort, isConnected, state.chipInfo, state.phase, detectChip]);

  const handleErase = useCallback(async () => {
    if (!serialPort || !serialStreamManager.isReady()) {
      onError?.("Serial port not available");
      return;
    }
    try {
      onStatusUpdate?.("Clearing filesystem... This may take 10-30 seconds");
      await serialStreamManager.eraseFlash();
      onStatusUpdate?.("Filesystem cleared");
    } catch (err) {
      onError?.(`Flash erase failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [serialPort, onStatusUpdate, onError]);

  if (!isConnected) {
    return <p className="text-muted-foreground text-sm">Connect your device first to access the Flasher.</p>;
  }

  const compatibleFirmwares = getCompatibleFirmwares();
  const firmwareOptions: FlasherOption[] = compatibleFirmwares.map((fw) => ({ id: fw.version, label: fw.name }));
  const flasherState: FlasherState = state.phase === "completed" ? "done" : (state.phase as FlasherState);

  return (
    <FirmwareFlasher
      chipFamilies={RECOVERY_CHIP_FAMILIES}
      selectedChip={state.chipInfo?.chipFamily}
      onChipChange={(id) => enterRecoveryMode(id)}
      detectedChip={state.chipInfo?.chipFamily}
      firmwares={firmwareOptions}
      selectedFirmware={state.selectedFirmware?.version}
      onFirmwareChange={(id) => {
        const fw = compatibleFirmwares.find((f) => f.version === id);
        if (fw) selectFirmware(fw);
      }}
      onFileSelect={async (file) => {
        const buffer = await file.arrayBuffer();
        setLocalFirmware(file.name, buffer);
      }}
      progress={Math.round(state.progress)}
      state={flasherState}
      error={state.error ?? undefined}
      onErase={handleErase}
      onFlash={() => startFlashing()}
    />
  );
}

/** Output/REPL/Flasher panel: the headless esp32-uploader hooks in, design-system UI out. */
export const ESP32OutputPanel = forwardRef<ESP32OutputPanelHandle, ESP32OutputPanelProps>(
  (
    {
      output,
      onClear,
      onStop,
      code = "",
      onStatusUpdate,
      onError,
      onSaveFileToDevice,
      onConnectionStatusChange,
      onSerialPortChange,
      className,
    }: ESP32OutputPanelProps,
    ref
  ) => {
  // Must be one of OutputPanel's own tab ids; Radix mounts only the matching tab, so an unknown id renders an empty panel.
  const [activeTab, setActiveTab] = useState<string>("output");
  const fileManagerRefreshRef = useRef<(() => void) | null>(null);

  const {
    isMounted,
    isConnected,
    serialPort,
    espSupported,
    connectToDevice,
    resetConnection,
    saveFileToDevice,
  } = useESP32Uploader({
    code,
    onStatusUpdate,
    onError,
  });

  useImperativeHandle(ref, () => ({
    connectToDevice,
    resetConnection,
  }), [connectToDevice, resetConnection]);

  useEffect(() => {
    if (onSaveFileToDevice && saveFileToDevice) {
      const wrappedSaveFileToDevice = async (filename: string, content: string) => {
        await saveFileToDevice(filename, content);
        if (fileManagerRefreshRef.current) {
          setTimeout(() => {
            fileManagerRefreshRef.current?.();
          }, 500);
        }
      };
      onSaveFileToDevice(wrappedSaveFileToDevice);
    }
  }, [saveFileToDevice, onSaveFileToDevice]);

  useEffect(() => {
    onConnectionStatusChange?.(isConnected);
  }, [isConnected, onConnectionStatusChange]);

  useEffect(() => {
    onSerialPortChange?.(serialPort || null);
  }, [serialPort, onSerialPortChange]);

  if (!isMounted) {
    return (
      <div className={className}>
        <p className="text-muted-foreground p-4 text-center text-sm">Loading ESP32 tools...</p>
      </div>
    );
  }

  const connectionState = isConnected ? "connected" : espSupported ? "disconnected" : "unsupported";

  return (
    <OutputPanel
      className={className}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      output={output}
      outputActions={
        <>
          <Button size="sm" variant="outline" onClick={onClear}>
            <Trash2 aria-hidden="true" />
            Clear
          </Button>
          <Button size="sm" variant="outline" onClick={onStop}>
            <StopIcon aria-hidden="true" />
            Stop
          </Button>
        </>
      }
      connectionState={connectionState}
      onConnect={connectToDevice}
      onDisconnect={resetConnection}
      replContent={<ReplTab serialPort={serialPort ?? null} isConnected={isConnected} />}
      flasherContent={
        <FlasherTab
          serialPort={serialPort ?? null}
          isConnected={isConnected}
          onStatusUpdate={onStatusUpdate}
          onError={onError}
        />
      }
    />
  );
  }
);

ESP32OutputPanel.displayName = "ESP32OutputPanel";
