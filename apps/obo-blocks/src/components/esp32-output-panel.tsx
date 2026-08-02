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

import { Button } from "@/components/ui/button";
import { FirmwareFlasher, type FlasherOption, type FlasherState } from "@/components/ui/firmware-flasher";
import { OutputPanel, type OutputPanelTab } from "@/components/ui/output-panel";
import { ReplConsole } from "@/components/ui/repl-console";
import { Toolbar } from "@/components/ui/toolbar";

interface ESP32OutputPanelProps {
  /** Terminal output text (for output tab) */
  output?: string;
  /** Callback to clear output terminal */
  onClear: () => void;
  /** Callback to stop code execution */
  onStop: () => void;
  /** Python code to upload to device */
  code?: string;
  /** Status update callback */
  onStatusUpdate?: (status: string) => void;
  /** Error callback */
  onError?: (error: string) => void;
  /** Callback when file is opened in editor */
  onOpenFileInEditor?: (filename: string, content: string) => void;
  /** Callback to provide saveFileToDevice function to parent */
  onSaveFileToDevice?: (saveFunc: (filename: string, content: string) => Promise<void>) => void;
  /** Callback when connection status changes */
  onConnectionStatusChange?: (isConnected: boolean) => void;
  /** Callback when serial port is available */
  onSerialPortChange?: (serialPort: SerialPort | null) => void;
  /** Custom CSS class name */
  className?: string;
  /** ID for the output terminal textarea */
  terminalId?: string;
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

/** Interactive REPL tab. Ports ESP32REPL.tsx's connect/run lifecycle onto `ReplConsole`. */
function ReplTab({
  serialPort,
  isConnected: parentConnected,
}: {
  serialPort: SerialPort | null;
  isConnected: boolean;
}) {
  const [output, setOutput] = useState("");
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const connectingRef = useRef(false);

  const { connectToREPL, executeCommand, sendCtrlC, sendCtrlD, disconnect, isAwaitingContinuation } =
    useESP32REPL(serialPort);

  const push = useCallback((text: string) => {
    setOutput((prev) => trimLines(prev ? `${prev}\n${text}` : text, REPL_MAX_LINES));
  }, []);

  const doConnect = useCallback(async () => {
    if (!serialPort || connectingRef.current) return;
    connectingRef.current = true;
    try {
      push("Connecting to REPL…");
      await connectToREPL();
      setConnected(true);
      push("=== REPL Connected ===");
      push("Ready. Type Python commands below.");
    } catch (err) {
      push(`Connection failed: ${err instanceof Error ? err.message : String(err)}`);
      setConnected(false);
    } finally {
      connectingRef.current = false;
    }
  }, [serialPort, connectToREPL, push]);

  useEffect(() => {
    if (serialPort && parentConnected && !connected) doConnect();
  }, [serialPort, parentConnected, connected]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!parentConnected && connected) {
      setConnected(false);
      setOutput("");
      connectingRef.current = false;
      disconnect();
    }
  }, [parentConnected, connected, disconnect]);

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

/** Firmware flashing tab. Ports ESP32Flasher.tsx's detect/select/flash lifecycle onto `FirmwareFlasher`. */
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

/**
 * Shared ESP32 Output Panel with tabs for Output, REPL, and Flasher.
 * Used in both obo-code and obo-blocks applications.
 */
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
      className = "output",
      terminalId = "terminal-output",
    }: ESP32OutputPanelProps,
    ref
  ) => {
  const [activeTab, setActiveTab] = useState<string>("console");
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

  // Pass saveFileToDevice function to parent component
  useEffect(() => {
    if (onSaveFileToDevice && saveFileToDevice) {
      // Wrap saveFileToDevice to also refresh file manager after saving
      const wrappedSaveFileToDevice = async (filename: string, content: string) => {
        await saveFileToDevice(filename, content);
        // Refresh file manager after successful save
        if (fileManagerRefreshRef.current) {
          setTimeout(() => {
            fileManagerRefreshRef.current?.();
          }, 500);
        }
      };
      onSaveFileToDevice(wrappedSaveFileToDevice);
    }
  }, [saveFileToDevice, onSaveFileToDevice]);

  // Update parent about connection status
  useEffect(() => {
    onConnectionStatusChange?.(isConnected);
  }, [isConnected, onConnectionStatusChange]);

  // Update parent about serial port availability
  useEffect(() => {
    onSerialPortChange?.(serialPort || null);
  }, [serialPort, onSerialPortChange]);

  if (!isMounted) {
    return (
      <div className={className} id={className}>
        <div style={{ padding: "1rem", textAlign: "center" }}>
          Loading ESP32 tools...
        </div>
      </div>
    );
  }

  const connectionState = isConnected ? "connected" : espSupported ? "disconnected" : "unsupported";

  // Kept as a raw, uncontrolled textarea: `@nexus-tools/pyodide-executor`'s
  // `createTerminalLoader` writes program output straight to
  // `document.getElementById(terminalId)` as a side effect, bypassing React
  // state entirely. A `Terminal` component here would silently receive none
  // of that output.
  const consoleTab: OutputPanelTab = {
    id: "console",
    label: "Output",
    content: (
      <div className="flex h-full flex-col overflow-hidden">
        <Toolbar label="Output actions" size="sm">
          <Button size="sm" variant="outline" onClick={onClear}>
            <Trash2 aria-hidden="true" />
            Clear
          </Button>
          <Button size="sm" variant="outline" onClick={onStop}>
            <StopIcon aria-hidden="true" />
            Stop
          </Button>
        </Toolbar>
        <div className="flex-1 overflow-hidden p-2">
          <textarea
            id={terminalId}
            className="terminal-output h-full w-full"
            readOnly
            rows={10}
            value={output || ""}
            defaultValue={output !== undefined ? undefined : ""}
          />
        </div>
      </div>
    ),
  };

  const tabs: OutputPanelTab[] = [
    consoleTab,
    { id: "repl", label: "REPL", requiresDevice: true },
    { id: "flasher", label: "Flasher", requiresDevice: true },
  ];

  return (
    <div className={className} id={className}>
      <OutputPanel
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
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
    </div>
  );
  }
);

ESP32OutputPanel.displayName = "ESP32OutputPanel";
