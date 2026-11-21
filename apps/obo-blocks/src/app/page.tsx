"use client";

import { BlocklyDialogs } from "@nexus-tools/design-system/components/blockly-dialogs";
import { CodeEditor, type CodeEditorHandle } from "@nexus-tools/design-system/components/code-editor";
import { DeviceFileManager, type DeviceFileManagerHandle } from "@nexus-tools/design-system/components/device-file-manager";
import { ESP32OutputPanel, type ESP32OutputPanelHandle } from "@nexus-tools/design-system/components/esp32-output-panel";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@nexus-tools/design-system/components/ui/resizable";
import { WorkspaceLayout, WorkspaceColumn } from "@nexus-tools/design-system/components/ui/workspace-layout";
import { WorkspaceNavbar } from "@nexus-tools/design-system/components/workspace-navbar";
import { serialStreamManager, useESP32Runner, type SerialPort } from "@nexus-tools/esp32-uploader";
import dynamic from "next/dynamic";
import { useState, useCallback, useRef, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { useBlocklyHandlers } from "@/hooks/use-blockly-handlers";
import { useEditorHandlers } from "@/hooks/use-editor-handlers";

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

const subscribeNever = () => () => {};

export default function Home() {
  const [code, setCode] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  // Blockly measures its own container, so it mounts client-side only: false on the server and during hydration.
  const isClient = useSyncExternalStore(subscribeNever, () => true, () => false);
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

  const device = useESP32Runner();

  const handleRunInESP32 = useCallback(async () => {
    if (!serialPort) {
      showNotification("Connect device first");
      return;
    }

    if (!code.trim()) {
      showNotification("No code to run");
      return;
    }

    try {
      await serialStreamManager.initialize(serialPort);
    } catch (error) {
      showNotification(`Failed to run on ESP32: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }
    outputPanelRef.current?.showOutput();
    const outcome = await device.run(code);
    if (outcome === "error") showNotification("Your code stopped with an error - see Output");
  }, [serialPort, code, showNotification, device]);

  const handleRun = useCallback(() => {
    device.hide();
    handleRunCode();
  }, [device, handleRunCode]);

  const handleStop = useCallback(() => {
    if (device.showing && device.isRunning) device.stop();
    else handleStopCode();
  }, [device, handleStopCode]);

  const handleClear = useCallback(() => {
    if (device.showing) device.clear();
    else handleClearTerminal();
  }, [device, handleClearTerminal]);

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

  return (
    <WorkspaceLayout
      header={<WorkspaceNavbar title="Obo Blocks" logoSrc="/brand/obo-blocks-wordmark.webp" logoSrcDark="/brand/obo-blocks-wordmark-dark.webp" connectionState={isDeviceConnected ? "connected" : "disconnected"} />}
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
      <WorkspaceColumn grow={3} collapsible collapsedSize={0}>
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
              onRun={handleRun}
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
              output={device.showing ? device.output : output}
              onClear={handleClear}
              onStop={handleStop}
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
