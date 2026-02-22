"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useEffect, useRef } from "react";

import { CodePanel } from "@/components/code-panel";
import { Navbar } from "@/components/navbar";
import { Notification } from "@/components/notification";
import { OutputPanel } from "@/components/output-panel";
import { useBlocklyHandlers } from "@/hooks/use-blockly-handlers";
import { useEditorHandlers } from "@/hooks/use-editor-handlers";

import type { CodeEditorHandle } from "@/components/code-editor";

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
  const saveFileToDeviceRef = useRef<(filename: string, content: string) => Promise<void>>();
  const codeEditorRef = useRef<CodeEditorHandle>(null);

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

  // Callback to open file in code editor
  const handleOpenFileInEditor = useCallback((filename: string, content: string) => {
    if (codeEditorRef.current) {
      codeEditorRef.current.openFileInTab(filename, content);
      showNotification(`Opened ${filename} in editor`);
    }
  }, [showNotification]);

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
        <div className={`main-layout ${isEditing ? 'editing-mode' : ''}`}>
          <div className="blockly-section">
            <BlocklyEditor
              onCodeChange={handleCodeChange}
              onEditToggle={handleEditToggleWrapper}
              showNotification={showNotification}
            />
          </div>

          <div className="panels-section">
            <CodePanel
              code={code}
              isEditing={isEditing}
              onCodeChange={handleCodeChange}
              onEditToggle={handleEditToggleWrapper}
              onRun={handleRunCode}
              onCopy={handleCopy}
              onExport={handleExport}
              onSaveToDevice={handleSaveToDevice}
              isConnected={isDeviceConnected}
              codeEditorRef={codeEditorRef}
            />

            <OutputPanel 
              onClear={handleClearTerminal} 
              onStop={handleStopCode}
              code={code}
              onStatusUpdate={showNotification}
              onError={showNotification}
              onOpenFileInEditor={handleOpenFileInEditor}
              onSaveFileToDevice={(saveFunc) => {
                saveFileToDeviceRef.current = saveFunc;
              }}
              onConnectionStatusChange={setIsDeviceConnected}
            />
          </div>
        </div>
      )}
    </div>
  );
}
