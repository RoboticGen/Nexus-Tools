"use client";

import { DeviceFileManagerSidebar, serialStreamManager, type DeviceFileManagerSidebarHandle, type SerialPort } from "@nexus-tools/esp32-uploader";
import { SharedCodePanel } from "@nexus-tools/ui/components/shared-code-panel";
import { listNexusFiles, saveNexusFile, deleteNexusFile, type NexusToolFile } from "@nexus-tools/utils";
import { notification } from "antd";
import dynamic from "next/dynamic";
import { useState, useCallback, useEffect, useRef } from "react";

import { ESP32OutputPanel, type ESP32OutputPanelHandle } from "@/components/esp32-output-panel";
import { Navbar } from "@/components/navbar";
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
  const [isEditing, setIsEditing] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [, setIsDeviceConnected] = useState(false);
  const [serialPort, setSerialPort] = useState<SerialPort | null>(null);
  const [activeEditorFileName, setActiveEditorFileName] = useState<string | null>(null);
  const [fileManagerExpanded, setFileManagerExpanded] = useState(true);
  const [nexusFiles, setNexusFiles] = useState<NexusToolFile[]>([]);
  const [isNexusFilesLoading, setIsNexusFilesLoading] = useState(false);
  const saveFileToDeviceRef = useRef<(filename: string, content: string) => Promise<void>>();
  const codeEditorRef = useRef<SharedCodeEditorHandle>(null);
  const outputPanelRef = useRef<ESP32OutputPanelHandle>(null);
  const fileManagerRef = useRef<DeviceFileManagerSidebarHandle>(null);

  const nexusApiUrl = process.env.NEXT_PUBLIC_NEXUS_TOOLS_API_URL ?? "";

  const { copyTextToClipboard, downloadPythonFile } = useEditorHandlers();

  const showNotification = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    notification[type]({
      message: type === "success" ? "Success" : type === "error" ? "Error" : "Info",
      description: message,
      duration: 2,
      placement: "topRight",
    });
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
        // eslint-disable-next-line @typescript-eslint/no-var-requires
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

  const handleNexusFilesRefresh = useCallback(async () => {
    if (!nexusApiUrl) return;
    setIsNexusFilesLoading(true);
    try {
      const result = await listNexusFiles(nexusApiUrl, "OBO_BLOCKS");
      setNexusFiles(result.files);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showNotification(msg, "error");
    } finally {
      setIsNexusFilesLoading(false);
    }
  }, [nexusApiUrl, showNotification]);

  const handleSaveToNexus = useCallback(async (filename: string, content: string) => {
    if (!nexusApiUrl) return;
    try {
      await saveNexusFile(nexusApiUrl, "OBO_BLOCKS", filename, content);
      showNotification(`"${filename}" saved to Nexus`, "success");
      await handleNexusFilesRefresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showNotification(msg, "error");
    }
  }, [nexusApiUrl, showNotification, handleNexusFilesRefresh]);

  const handleDeleteNexusFile = useCallback(async (id: string) => {
    if (!nexusApiUrl) return;
    await deleteNexusFile(nexusApiUrl, id);
    showNotification("File deleted from Nexus", "success");
  }, [nexusApiUrl, showNotification]);

  // Callback to open file in code editor (from file manager)
  const handleOpenFileInEditor = useCallback((filename: string, content: string) => {
    if (codeEditorRef.current) {
      codeEditorRef.current.openFileInTab(filename, content);
      setActiveEditorFileName(filename);
    }
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
          showNotification(`Saved ${filename} to device`);
          // Refresh file manager after save
          fileManagerRef.current?.refreshFiles();
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
      <Navbar />

      <div className="app-body">
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
          nexusFiles={nexusFiles}
          isNexusFilesLoading={isNexusFilesLoading}
          onNexusFilesRefresh={handleNexusFilesRefresh}
          onDeleteNexusFile={handleDeleteNexusFile}
        />

        {isClient && (
          <div
            className={`main-layout${isEditing ? " editing-mode" : ""}`}
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
                onRunInESP32={handleRunInESP32}
                onCopy={handleCopy}
                onExport={handleExport}
                onSaveToDevice={handleSaveToDevice}
                onSaveToNexus={handleSaveToNexus}
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
      </div>
    </div>
  );
}
