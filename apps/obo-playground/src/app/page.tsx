"use client";

import { SharedCodePanel } from "@nexus-tools/ui";
import { DeviceFileManagerSidebar, serialStreamManager, type DeviceFileManagerSidebarHandle } from "@nexus-tools/esp32-uploader";
import type { SharedCodeEditorHandle } from "@nexus-tools/ui/components/shared-code-editor";
import { notification } from "antd";
import { useCallback, useRef, useState } from "react";

import { ESP32OutputPanel } from "@/components/esp32-output-panel";
import { Navbar } from "@/components/navbar";
import { useObocarRunner } from "@/hooks/use-obocar-runner";
import "@/styles/sidebar.css";

const DEFAULT_CODE = `from obocar import OboCar

car = OboCar()

for i in range(3):
    car.forward(speed=100)
    car.sleep(5)
    car.right(speed=100)
    car.sleep(5)
    print(car.sensor("front"))

print(car.status())
`;

export default function Home() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [serialPort, setSerialPort] = useState<SerialPort | null>(null);
  const [activeEditorFileName, setActiveEditorFileName] = useState<string | null>(null);
  const [fileManagerExpanded, setFileManagerExpanded] = useState(true);
  const codeEditorRef = useRef<SharedCodeEditorHandle>(null);
  const outputPanelRef = useRef<{ connectToDevice?: () => void; resetConnection?: () => void }>(null);
  const saveFileToDeviceRef = useRef<(filename: string, content: string) => Promise<void>>();
  const fileManagerRef = useRef<DeviceFileManagerSidebarHandle>(null);

  const showNotification = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    notification[type]({
      message: type === "success" ? "Success" : type === "error" ? "Error" : "Info",
      description: message,
      duration: 2,
      placement: "topRight",
    });
  }, []);

  const { runCode, stopCode, isRunning, output, clearOutput } = useObocarRunner({
    workerUrl: "/worker.js",
    onError: (error: string) => showNotification(error, "error"),
  });

  const handleRun = useCallback(() => {
    if (!code.trim() || isRunning) return;
    runCode(code);
  }, [code, isRunning, runCode]);

  const handleOpenFileInEditor = useCallback((filename: string, content: string) => {
    codeEditorRef.current?.openFileInTab(filename, content);
    setActiveEditorFileName(filename);
  }, []);

  const handleConnect = useCallback(() => {
    outputPanelRef.current?.connectToDevice?.();
  }, []);

  const handleDisconnect = useCallback(() => {
    outputPanelRef.current?.resetConnection?.();
  }, []);

  const handleRunInESP32 = useCallback(async () => {
    if (!serialPort) {
      showNotification("Connect device first");
      return;
    }

    try {
      await serialStreamManager.initialize(serialPort);
      // Ctrl-C (interrupt) + Ctrl-D (soft reset) => runs boot.py then main.py
      await serialStreamManager.sendData("\x03\x04");
      showNotification("ESP32 restarting to run main.py...");
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      showNotification(`Failed to run on ESP32: ${msg}`);
    }
  }, [serialPort, showNotification]);

  const handleSaveToDevice = useCallback(
    async (filename: string, content: string) => {
      try {
        if (saveFileToDeviceRef.current) {
          await saveFileToDeviceRef.current(filename, content);
          showNotification(`Saved ${filename} to device`, "success");
          fileManagerRef.current?.refreshFiles();
        } else {
          showNotification("Device not connected");
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Failed to save file";
        showNotification(errorMsg, "error");
      }
    },
    [showNotification]
  );

  const handleCopy = useCallback(async () => {
    if (!code.trim()) {
      showNotification("No code to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      showNotification("Code copied to clipboard", "success");
    } catch {
      showNotification("Failed to copy code", "error");
    }
  }, [code, showNotification]);

  const handleExport = useCallback(() => {
    if (!code.trim()) {
      showNotification("No code to export");
      return;
    }
    const blob = new Blob([code], { type: "text/x-python" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "script.py";
    a.click();
    URL.revokeObjectURL(url);
    showNotification("Code exported as script.py", "success");
  }, [code, showNotification]);

  return (
    <div className="app-container">
      <Navbar />
      <div
        className={`main-content main-content-with-file-manager${!fileManagerExpanded ? " file-manager-collapsed" : ""}`}
      >
        <div className="left-panel">
          <SharedCodePanel
            code={code}
            isEditing
            onCodeChange={setCode}
            onActiveTabChange={setActiveEditorFileName}
            onRun={handleRun}
            onRunInESP32={handleRunInESP32}
            onCopy={handleCopy}
            onExport={handleExport}
            onSaveToDevice={handleSaveToDevice}
            isConnected={serialPort !== null}
            codeEditorRef={codeEditorRef}
            showEditButton={false}
            className="code-panel"
          />
          <ESP32OutputPanel
            ref={outputPanelRef}
            output={output}
            onClear={clearOutput}
            onStop={stopCode}
            code={code}
            onStatusUpdate={showNotification}
            onError={showNotification}
            onOpenFileInEditor={handleOpenFileInEditor}
            onSaveFileToDevice={(saveFunc) => {
              saveFileToDeviceRef.current = saveFunc;
            }}
            onConnectionStatusChange={() => {}}
            onSerialPortChange={setSerialPort}
            className="output-panel"
          />
        </div>
        <div className="right-panel">
          <div className="simulation-panel">
            <div className="simulation-panel-header">
              <p className="simulation-panel-title">Simulation</p>
            </div>
            <div className="simulation-panel-body">
              <p className="simulation-placeholder">Simulation view coming soon</p>
            </div>
          </div>
        </div>
      </div>

      <DeviceFileManagerSidebar
        ref={fileManagerRef}
        serialPort={serialPort}
        isConnected={serialPort !== null}
        activeFileName={activeEditorFileName}
        onError={showNotification}
        onOpenFileInEditor={handleOpenFileInEditor}
        onExpandChange={setFileManagerExpanded}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />
    </div>
  );
}
