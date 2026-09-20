"use client";

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
import { serialStreamManager, type SerialPort } from "@nexus-tools/esp32-uploader";
import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

import { TurtleWorkspace } from "@/components/turtle-workspace";
import { usePythonRunner } from "@/hooks/use-python-runner";

const DEFAULT_CODE = `import turtle

colors = ['red', 'purple', 'blue', 'green', 'orange', 'yellow']
t = turtle.Turtle()

for x in range(360):
  t.pencolor(colors[x % 6])
  t.width(x // 100 + 1)
  t.forward(x)
  t.left(59)
`;

export default function Home() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [background, setBackground] = useState<string>("No-Background");
  const [isDeviceConnected, setIsDeviceConnected] = useState(false);
  const [serialPort, setSerialPort] = useState<SerialPort | null>(null);
  const [activeEditorFileName, setActiveEditorFileName] = useState<string | null>(null);
  const codeEditorRef = useRef<CodeEditorHandle>(null);
  const outputPanelRef = useRef<ESP32OutputPanelHandle>(null);
  // React 19's `useRef` requires an explicit initial value — no zero-arg overload.
  const saveFileToDeviceRef = useRef<((filename: string, content: string) => Promise<void>) | undefined>(undefined);
  const fileManagerRef = useRef<DeviceFileManagerHandle>(null);

  useEffect(() => {
    document.title = "Obo Code";
  }, []);

  const showNotification = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    toast[type](message);
  }, []);

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

    if (!code.trim()) {
      showNotification("No code to run");
      return;
    }

    try {
      await serialStreamManager.initialize(serialPort);

      // Run the buffer the way Thonny runs a script: hand it to the REPL in paste mode rather
      // than writing it to flash. Nothing on the device is modified, so this neither needs nor
      // overwrites a main.py -- which is why the old Ctrl-C + Ctrl-D soft reset appeared to do
      // nothing on a board that has no main.py: it only re-ran what was already stored.
      //
      // Output is not captured here on purpose. use-esp32-repl holds a serialStreamManager
      // listener, so the device's stdout streams to the REPL tab as it is produced -- including
      // for scripts that never terminate, which a one-shot executeRawREPL would abandon at its
      // timeout.
      // Leading \r flushes any half-typed line before the interrupts land, which is what
      // ViperIDE's runCurrentFile does (`port.write('\r\x03\x03')`) -- without it a partial
      // line can swallow the first Ctrl-C.
      await serialStreamManager.sendData("\r\x03\x03"); // interrupt whatever is running
      await serialStreamManager.sendData("\x02"); // leave raw mode if a previous op left us in it
      await serialStreamManager.sendData("\x05"); // paste mode
      await serialStreamManager.sendData(code.replace(/\r\n/g, "\n"));
      await serialStreamManager.sendData("\x04"); // execute

      showNotification("Running on ESP32 - output is in the REPL tab");
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      showNotification(`Failed to run on ESP32: ${msg}`);
    }
  }, [serialPort, code, showNotification]);

  const { runCode, stopCode, isRunning, output, clearOutput } = usePythonRunner({
    onError: (error) => showNotification(error, "error"),
    onSuccess: () => {},
  });

  const handleRun = useCallback(() => {
    if (!code.trim()) {
      showNotification("No code to run");
      return;
    }
    if (isRunning) {
      showNotification("Code is already running");
      return;
    }
    runCode(code);
  }, [code, isRunning, runCode, showNotification]);

  const handleStop = useCallback(() => {
    if (!isRunning) {
      showNotification("No code is running");
      return;
    }
    stopCode();
    showNotification("Code execution stopped");
  }, [isRunning, stopCode, showNotification]);

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

  const handleClear = useCallback(() => {
    if (isRunning) {
      showNotification("Stop the code execution first");
      return;
    }
    clearOutput();
    // Clear turtle workspace (Brython turtle uses SVG)
    const turtleCanvas = document.getElementById("turtle-canvas");
    if (turtleCanvas) {
      // Remove SVG elements created by Brython turtle
      const svgElements = turtleCanvas.getElementsByTagName("svg");
      while (svgElements.length > 0) {
        svgElements[0].remove();
      }
      // Also clear any canvas elements just in case
      const canvasElements = turtleCanvas.getElementsByTagName("canvas");
      while (canvasElements.length > 0) {
        canvasElements[0].remove();
      }
    }
    showNotification("Terminal cleared");
  }, [isRunning, clearOutput, showNotification]);

  return (
    <WorkspaceLayout
      header={<WorkspaceNavbar title="Obo Code" logoSrc="/brand/obo-code-wordmark.webp" connectionState={isDeviceConnected ? "connected" : "disconnected"} />}
      sidebar={
        <DeviceFileManager
          ref={fileManagerRef}
          serialPort={serialPort}
          isConnected={serialPort !== null}
          activeFileName={activeEditorFileName}
          onError={(error) => showNotification(error, "error")}
          onOpenFileInEditor={handleOpenFileInEditor}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />
      }
    >
      {/*
        `grow` rather than `width="340px"`: a fixed-width column is pinned
        (WorkspaceLayout sets minSize === maxSize for it), and the turtle canvas
        is obo-code's primary output — the pre-migration layout gave it `2fr`.
        Weights keep it resizable while the editor still opens as the wider half.
      */}
      <WorkspaceColumn grow={3}>
        {/*
          A nested vertical group, not `flex` weights: the editor/output split
          renders a drag handle, and a CSS ratio gives a pointer event nothing
          to change — the handle would look draggable and do nothing.
        */}
        <ResizablePanelGroup direction="vertical" className="gap-2">
          <ResizablePanel defaultSize={62} minSize={20}>
            <CodeEditor
                  defaultFileName="test.py"
              ref={codeEditorRef}
              code={code}
              onChange={setCode}
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
              output={output}
              onClear={handleClear}
              onStop={handleStop}
              code={code}
              onStatusUpdate={(status) => showNotification(status)}
              onError={(error) => showNotification(error, "error")}
              onOpenFileInEditor={handleOpenFileInEditor}
              onSaveFileToDevice={(saveFunc) => {
                saveFileToDeviceRef.current = saveFunc;
              }}
              onConnectionStatusChange={setIsDeviceConnected}
              onSerialPortChange={setSerialPort}
              className="h-full"
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </WorkspaceColumn>

      {/*
        `collapsible` + `collapsedSize={0}`: dragging the divider past the min
        snaps the turtle canvas shut and gives the editor the full row, then
        drags back open — obo-code is often used for plain Python with no
        turtle output at all.

        `pl-2` restores the gutter WorkspaceColumn drops on non-first columns
        (`[&:not(:first-child)]:pl-0`), which left the panel's rounded corner
        sitting flush against the divider instead of matching the 8px gap the
        editor/output split has.
      */}
      <WorkspaceColumn
        grow={2}
        collapsible
        collapsedSize={0}
        className="[&:not(:first-child)]:pl-2"
      >
        <TurtleWorkspace background={background} onBackgroundChange={setBackground} />
      </WorkspaceColumn>
    </WorkspaceLayout>
  );
}
