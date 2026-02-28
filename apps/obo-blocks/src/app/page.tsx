"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useEffect, useRef } from "react";

import { ChatPanel } from "@/components/chat-panel";
import { CodePanel } from "@/components/code-panel";
import { Navbar } from "@/components/navbar";
import { Notification } from "@/components/notification";
import { OutputPanel } from "@/components/output-panel";
import { useBlocklyHandlers } from "@/hooks/use-blockly-handlers";
import { useEditorHandlers } from "@/hooks/use-editor-handlers";
import { convertPythonToBlocks } from "@/python-to-blocks";

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

  const { copyTextToClipboard, downloadPythonFile } = useEditorHandlers();

  const showNotification = useCallback((message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 1500);
  }, []);

  // Ref to hold the workspace JSON importer registered by BlocklyEditor
  const importerRef = useRef<((jsonString: string) => boolean) | null>(null);

  const handleRegisterImporter = useCallback(
    (importer: (jsonString: string) => boolean) => {
      importerRef.current = importer;
    },
    []
  );

  const handleChatImportJson = useCallback(
    (jsonString: string): boolean => {
      if (importerRef.current) {
        const success = importerRef.current(jsonString);
        if (success) showNotification("Workspace imported from chat");
        return success;
      }
      return false;
    },
    [showNotification]
  );

  const handleConvertPython = useCallback(
    async (pythonCode: string): Promise<string | null> => {
      try {
        const json = await convertPythonToBlocks(pythonCode);

        // Debug: download the converted JSON as a file
        if (json) {
          try {
            const pretty = JSON.stringify(JSON.parse(json), null, 2);
            const blob = new Blob([pretty], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `converted-blocks-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          } catch {
            // If JSON parsing fails, save raw string
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `converted-blocks-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        }

        return json;
      } catch (err) {
        console.error("Python-to-blocks conversion error:", err);
        return null;
      }
    },
    []
  );

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

  return (
    <div className="app-container">
      <Notification message={notification} />
      <ChatPanel onImportJson={handleChatImportJson} onConvertPython={handleConvertPython} />
      <Navbar />

      {isClient && (
        <div className={`main-layout ${isEditing ? 'editing-mode' : ''}`}>
          <div className="blockly-section">
            <BlocklyEditor
              onCodeChange={handleCodeChange}
              onEditToggle={handleEditToggleWrapper}
              showNotification={showNotification}
              onRegisterImporter={handleRegisterImporter}
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
            />

            <OutputPanel onClear={handleClearTerminal} onStop={handleStopCode} />
          </div>
        </div>
      )}
    </div>
  );
}
