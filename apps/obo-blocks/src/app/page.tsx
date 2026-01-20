"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useEffect } from "react";

import { CodePanel } from "@/components/code-panel";
import { Navbar } from "@/components/navbar";
import { Notification } from "@/components/notification";
import { OutputPanel } from "@/components/output-panel";
import { useBlocklyHandlers } from "@/hooks/use-blockly-handlers";
import { useEditorHandlers } from "@/hooks/use-editor-handlers";

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
      <Navbar />

      {isClient && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gridTemplateRows: "auto 1fr auto",
            gap: "0.5rem",
            padding: "0.5rem",
            flex: 1,
            overflow: "hidden",
            gridTemplateAreas: `
              "blocky code"
              "blocky code"
              "blocky output"
            `,
          }}
        >
          <div
            style={{
              gridArea: "blocky",
              height: "100%",
              minHeight: "400px",
              display: isEditing ? "none" : "block",
            }}
          >
            <BlocklyEditor
              onCodeChange={handleCodeChange}
              onEditToggle={handleEditToggleWrapper}
              showNotification={showNotification}
            />
          </div>

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
      )}
    </div>
  );
}
