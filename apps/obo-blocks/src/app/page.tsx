"use client";

import { DeviceFileManagerSidebar } from "@nexus-tools/esp32-uploader";
import { SharedCodePanel } from "@nexus-tools/ui/components/shared-code-panel";
import dynamic from "next/dynamic";
import { useState, useCallback, useEffect, useRef } from "react";

import { ESP32OutputPanel } from "@/components/esp32-output-panel";
import { Navbar } from "@/components/navbar";
import { Notification } from "@/components/notification";
import { useBlocklyHandlers } from "@/hooks/use-blockly-handlers";
import { useEditorHandlers } from "@/hooks/use-editor-handlers";

import type { SharedCodeEditorHandle } from "@nexus-tools/ui/components/shared-code-editor";

const BlocklyEditor = dynamic(
  () => import("@/components/blockly-editor").then((mod) => ({ default: mod.BlocklyEditor })),
  {
    ssr: false,
    loading: () => <div>Loading Blockly...</div>,
  }
);

export default function Home() {
  const [code, setCode] = useState("");
  const [notification, setNotification] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isDeviceConnected, setIsDeviceConnected] = useState(false);
  const [serialPort, setSerialPort] = useState<SerialPort | null>(null);
  const [activeEditorFileName, setActiveEditorFileName] = useState<string | null>(null);
  const [fileManagerExpanded, setFileManagerExpanded] = useState(true);
  const saveFileToDeviceRef = useRef<(filename: string, content: string) => Promise<void>>();
  const codeEditorRef = useRef<SharedCodeEditorHandle>(null);
  const outputPanelRef = useRef<{ switchToUploaderTab?: () => void }>(null);

  const { copyTextToClipboard, downloadPythonFile } = useEditorHandlers();

  const showNotification = useCallback((message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 1500);
  }, []);

  const {
    handleEditToggle,
    handleCopy,
    handleExport,
    handleRunCode,
    handleClearTerminal,
    handleStopCode,
  } = useBlocklyHandlers(code, isEditing, showNotification, copyTextToClipboard, downloadPythonFile);

  // Initialize worker
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      try {
        const workerModule = require("@/pyodide/loader");
        workerModule.getWorker();
      } catch (err) {
        console.error("Error initializing worker:", err);
      }
    }
  }, []);

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
  }, []);

  const handleEditToggleWrapper = useCallback(
    (editing: boolean) => {
      setIsEditing(editing);
      handleEditToggle(editing);
    },
    [handleEditToggle]
  );

  // Callback to open file in code editor (from file manager)
  const handleOpenFileInEditor = useCallback((filename: string, content: string) => {
    if (codeEditorRef.current) {
      codeEditorRef.current.openFileInTab(filename, content);
      setActiveEditorFileName(filename);
      showNotification(`Opened ${filename} in editor`);
    }
  }, [showNotification]);

  const handleUpload = useCallback(() => {
    outputPanelRef.current?.switchToUploaderTab?.();
    showNotification("Opening uploader...");
  }, [showNotification]);

  const handleConnect = useCallback(() => {
    outputPanelRef.current?.connectToDevice?.();
  }, []);

  const handleDisconnect = useCallback(() => {
    outputPanelRef.current?.resetConnection?.();
  }, []);

  const handleSaveToDevice = useCallback(
    async (filename: string, content: string) => {
      try {
        if (saveFileToDeviceRef.current) {
          await saveFileToDeviceRef.current(filename, content);
          showNotification(`Saved ${filename} to device`);
        } else {
          showNotification("Device not connected");
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Failed to save file";
        showNotification(errorMsg);
      }
    },
    [showNotification]
  );

  return (
    <div className="app-container">
      <Notification message={notification} />
      <Navbar />

      {isClient && (
        <div
          className={`main-layout main-content-with-file-manager${!fileManagerExpanded ? " file-manager-collapsed" : ""} ${isEditing ? "editing-mode" : ""}`}
        >
          <div className="blockly-section">
            <BlocklyEditor
              onCodeChange={handleCodeChange}
              onEditToggle={handleEditToggleWrapper}
              showNotification={showNotification}
            />
          </div>

          <div className="panels-section">
            <SharedCodePanel
              code={code}
              isEditing={isEditing}
              onCodeChange={handleCodeChange}
              onActiveTabChange={setActiveEditorFileName}
              onEditToggle={handleEditToggleWrapper}
              onRun={handleRunCode}
              onCopy={handleCopy}
              onExport={handleExport}
              onSaveToDevice={handleSaveToDevice}
              isConnected={serialPort !== null}
              codeEditorRef={codeEditorRef}
            />

            <ESP32OutputPanel 
              ref={outputPanelRef}
              onClear={handleClearTerminal} 
              onStop={handleStopCode}
              code={code}
              onStatusUpdate={showNotification}
              onError={showNotification}
              onOpenFileInEditor={handleOpenFileInEditor}
              onSaveFileToDevice={(saveFunc: (filename: string, content: string) => Promise<void>) => {
                saveFileToDeviceRef.current = saveFunc;
              }}
              onConnectionStatusChange={setIsDeviceConnected}
              onSerialPortChange={setSerialPort}
            />
          </div>
        </div>
      )}

      <DeviceFileManagerSidebar
        serialPort={serialPort}
        isConnected={serialPort !== null}
        activeFileName={activeEditorFileName}
        onError={showNotification}
        onOpenFileInEditor={handleOpenFileInEditor}
        onExpandChange={setFileManagerExpanded}
        onUpload={handleUpload}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />
    </div>
  );
}
