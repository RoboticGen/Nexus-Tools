"use client";

import { serialStreamManager, type SerialPort } from "@nexus-tools/esp32-uploader";
import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

import { CodeEditor, type CodeEditorHandle } from "@nexus-tools/design-system/components/code-editor";
import { DeviceFileManager, type DeviceFileManagerHandle } from "@nexus-tools/design-system/components/device-file-manager";
import { ESP32OutputPanel, type ESP32OutputPanelHandle } from "@nexus-tools/design-system/components/esp32-output-panel";
import { BlocklyDialogs } from "@nexus-tools/design-system/components/blockly-dialogs";
import { WorkspaceNavbar } from "@nexus-tools/design-system/components/workspace-navbar";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@nexus-tools/design-system/components/ui/resizable";
import { WorkspaceLayout, WorkspaceColumn } from "@nexus-tools/design-system/components/ui/workspace-layout";
import { useBlocklyHandlers } from "@/hooks/use-blockly-handlers";
import { useEditorHandlers } from "@/hooks/use-editor-handlers";

import dynamic from "next/dynamic";

const BlocklyEditor = dynamic(
  () => import("@/components/blockly-editor").then((mod) => ({ default: mod.BlocklyEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="text-muted-foreground flex h-full items-center justify-center">
        Loading Blockly...
      </div>
    ),
  }
);

export default function Home() {
  const [code, setCode] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isDeviceConnected, setIsDeviceConnected] = useState(false);
  const [serialPort, setSerialPort] = useState<SerialPort | null>(null);
  const [activeEditorFileName, setActiveEditorFileName] = useState<string | null>(null);
  // React 19's `useRef` requires an explicit initial value — no zero-arg overload.
  const saveFileToDeviceRef = useRef<((filename: string, content: string) => Promise<void>) | undefined>(undefined);
  const codeEditorRef = useRef<CodeEditorHandle>(null);
  const outputPanelRef = useRef<ESP32OutputPanelHandle>(null);
  const fileManagerRef = useRef<DeviceFileManagerHandle>(null);

  const { copyTextToClipboard, downloadPythonFile } = useEditorHandlers();

  const showNotification = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    toast[type](message);
  }, []);

  const {
    handleEditToggle,
    handleCopy,
    handleExport,
    handleRunCode,
    handleClearTerminal,
    handleStopCode,
    output,
  } = useBlocklyHandlers(code, isEditing, showNotification, copyTextToClipboard, downloadPythonFile);

  // Blockly renders through a dynamic import and measures its own container, so it can only mount client-side. The Pyodide worker is no longer started here — `usePyodideRunner` (inside `useBlocklyHandlers`) owns its lifecycle.
  useEffect(() => {
    setIsClient(true);
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
          showNotification(`Saved ${filename} to device`);
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
    <WorkspaceLayout
      header={<WorkspaceNavbar title="Obo Blocks" logoSrc="/obo_blocks.webp" connectionState={isDeviceConnected ? "connected" : "disconnected"} />}
      sidebar={
        <DeviceFileManager
          ref={fileManagerRef}
          serialPort={serialPort}
          isConnected={serialPort !== null}
          activeFileName={activeEditorFileName}
          onError={showNotification}
          onOpenFileInEditor={handleOpenFileInEditor}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />
      }
    >
      {/* Columns render unconditionally: gating them on `isClient` changes the panel count between renders, which react-resizable-panels reports as "Previous layout not found for panel index N". Only the Blockly workspace itself waits for the client. */}
      <WorkspaceColumn grow={3} collapsible collapsedSize={0} className="[&:not(:last-child)]:pr-2">
        {isClient && (
          <BlocklyEditor
            onCodeChange={handleCodeChange}
            onEditToggle={handleEditToggleWrapper}
            showNotification={showNotification}
            className="h-full"
          />
        )}
      </WorkspaceColumn>

      <WorkspaceColumn grow={2}>
        <ResizablePanelGroup direction="vertical" className="gap-2">
          <ResizablePanel defaultSize={62} minSize={20}>
            <CodeEditor
              defaultFileName="main.py"
              ref={codeEditorRef}
              code={code}
              isEditing={isEditing}
              onChange={handleCodeChange}
              onEditToggle={handleEditToggleWrapper}
              onActiveTabChange={setActiveEditorFileName}
              onRun={handleRunCode}
              onRunInESP32={handleRunInESP32}
              onCopy={handleCopy}
              onExport={handleExport}
              onSaveToDevice={handleSaveToDevice}
              isConnected={serialPort !== null}
              className="h-full"
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={38} minSize={15}>
            <ESP32OutputPanel
              ref={outputPanelRef}
              output={output}
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
              className="h-full"
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </WorkspaceColumn>

      {/* Replaces Blockly's native window.prompt for variable creation. Not a column — WorkspaceLayout renders it outside the panel group. */}
      <BlocklyDialogs />
    </WorkspaceLayout>
  );
}
