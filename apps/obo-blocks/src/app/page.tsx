"use client";

import dynamic from "next/dynamic";

import { useState, useCallback, useEffect } from "react";

import { useEditorHandlers } from "@/hooks/use-editor-handlers";
import { CodeEditor } from "@/components/code-editor";

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

  useEffect(() => {
    setIsClient(true);
    
    // Initialize worker on page load
    if (typeof window !== 'undefined') {
      try {
        const workerModule = require('@/pyodide/loader');
        const worker = workerModule.getWorker();
        console.log("Worker initialized:", worker);
      } catch (err) {
        console.error("Error initializing worker:", err);
      }
    }
  }, []);

  const showNotification = useCallback((message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 1500);
  }, []);

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
  }, []);

  const handleEditToggle = useCallback((editing: boolean) => {
    setIsEditing(editing);
    if (editing) {
      showNotification("Editing enabled");
    } else {
      showNotification("Editing disabled");
    }
  }, [showNotification]);

  const handleCopy = useCallback(async () => {
    if (code === "") {
      showNotification("No code to copy");
      return;
    }
    await copyTextToClipboard(code);
    showNotification("Code copied to clipboard");
  }, [code, copyTextToClipboard, showNotification]);

  const handleExport = useCallback(() => {
    if (code === "") {
      showNotification("No code to export");
      return;
    }
    downloadPythonFile(code, "script.py");
    showNotification("Code exported as script.py");
  }, [code, downloadPythonFile, showNotification]);

  const handleRunCode = useCallback(() => {
    if (code === "") {
      showNotification("No code to run");
      return;
    }
    if (typeof window !== 'undefined') {
      try {
        const workerModule = require('@/pyodide/loader');
        const workerInstance = workerModule.getWorker();
        console.log("Worker instance:", workerInstance);
        if (workerInstance) {
          console.log("Sending code to worker:", code);
          workerInstance.postMessage({ code: code, command: "run" });
          showNotification("Code execution started");
        } else {
          console.error("Worker is not available");
          showNotification("Worker is not available");
        }
      } catch (err) {
        console.error("Error running code:", err);
        showNotification(`Error: ${err}`);
      }
    }
  }, [code, showNotification]);

  const handleClearTerminal = useCallback(() => {
    const terminal = document.getElementById("terminal-output") as HTMLTextAreaElement;
    if (terminal) {
      terminal.value = "Python 3.10 \n>>> ";
    }
    showNotification("Terminal cleared");
  }, [showNotification]);

  const handleStopCode = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        const workerModule = require('@/pyodide/loader');
        if (workerModule.stopWorker && typeof workerModule.stopWorker === 'function') {
          workerModule.stopWorker();
        }
      } catch (err) {
        console.error("Error stopping code:", err);
      }
    }
    showNotification("Code execution stopped");
  }, [showNotification]);

  return (
    <div className="app-container">
      {/* Notification */}
      <div
        id="notification"
        className={`notification ${notification ? "show" : ""}`}
      >
        <span>{notification}</span>
      </div>

      {/* Navbar */}
      <nav className="nav-bar">
        <img
          id="obo-blocks-logo"
          className="obo-blocks-logo"
          alt="Obo Blocks Logo"
          src="/obo_blocks.webp"
        />
        <a
          href="https://roboticgenacademy.com/"
          aria-label="Roboticgen Academy"
        >
          <img
            id="roboticgen-academy-logo"
            alt="Roboticgen Academy Logo"
            className="logo"
            src="/academyLogo.webp"
          />
        </a>
      </nav>

      {/* Main Content */}
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
          <div style={{ 
            gridArea: "blocky", 
            height: "100%", 
            minHeight: "400px",
            display: isEditing ? "none" : "block"
          }}>
            <BlocklyEditor
              onCodeChange={handleCodeChange}
              onEditToggle={handleEditToggle}
              showNotification={showNotification}
            />
          </div>

          {/* Code Panel */}
        <div
          className="code"
          id="code"
          style={{ gridArea: "code", minHeight: "10vh" }}
        >
          <div className="button-row">
            <p className="code-title">Python Code</p>
            <div className="button-group">
              <button
                className="button"
                id="edit-button"
                onClick={() => handleEditToggle(!isEditing)}
              >
                <i
                  className="fa fa-pencil"
                  style={{ paddingRight: "2px" }}
                ></i>
                <span id="edit-text">{isEditing ? "Editing" : "Edit"}</span>
              </button>
              <button
                className="button"
                id="run-button"
                onClick={handleRunCode}
              >
                <i id="run-icon" className="fa fa-flag"></i>
                <span id="run-text">Run</span>
              </button>
              <button
                className="button"
                id="copy-button"
                onClick={handleCopy}
              >
                <i className="fa fa-copy"></i>
                <span id="copy-text">Copy</span>
              </button>
              <button
                className="button"
                id="export-button"
                onClick={handleExport}
              >
                <i className="fa fa-file-export" style={{ paddingRight: "4px" }}></i>
                <span id="export-text">Export</span>
              </button>
            </div>
          </div>
          <div className="code-snippet" id="code-editor">
            <CodeEditor
              code={code}
              onChange={setCode}
              readOnly={!isEditing}
            />
          </div>
        </div>

        {/* Output Panel */}
        <div
          className="output"
          id="output"
          style={{ gridArea: "output" }}
        >
          <div className="button-row">
            <label htmlFor="terminal-output" className="output-title">
              Output
            </label>
            <div className="button-group">
              <button
                className="button"
                id="clear-button"
                onClick={handleClearTerminal}
              >
                <i id="run-clear" className="fa fa-trash"></i>
                <span id="run-text">Clear</span>
              </button>
              <button
                className="button"
                id="stop-button"
                onClick={handleStopCode}
              >
                <i id="run-clear" className="fa fa-trash"></i>
                <span id="stop-text">Stop</span>
              </button>
            </div>
          </div>
          <div className="terminal-output-div">
            <textarea
              id="terminal-output"
              className="terminal-output"
              rows={10}
              readOnly
              defaultValue="Python 3.10 \n>>> "
            ></textarea>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
