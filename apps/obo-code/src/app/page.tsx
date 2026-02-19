"use client";

import { useState, useCallback, useEffect } from "react";

import { CodeEditor } from "@/components/code-editor";
import { Navbar } from "@/components/navbar";
import { Notification } from "@/components/notification";
import { OutputTerminal } from "@/components/output-terminal";
import { TurtleWorkspace } from "@/components/turtle-workspace";
import { usePythonRunner } from "@/hooks/use-python-runner";
import "@/styles/sidebar.css";

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
  const [notification, setNotification] = useState<string | null>(null);
  const [background, setBackground] = useState<string>("No-Background");

  // Set the document title explicitly to ensure it shows correct app name
  useEffect(() => {
    document.title = "Obo Code";
  }, []);

  const showNotification = useCallback((message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 1500);
  }, []);

  const { runCode, stopCode, isRunning, isLoading, output, clearOutput } = usePythonRunner({
    onError: (error) => showNotification(error),
    onSuccess: () => {},
  });

  const handleRun = useCallback(() => {
    if (isLoading) {
      showNotification("Python engine is loading, please wait...");
      return;
    }
    if (!code.trim()) {
      showNotification("No code to run");
      return;
    }
    if (isRunning) {
      showNotification("Code is already running");
      return;
    }
    runCode(code);
  }, [code, isLoading, isRunning, runCode, showNotification]);

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
      showNotification("Code copied to clipboard");
    } catch {
      showNotification("Failed to copy code");
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
    showNotification("Code exported as script.py");
  }, [code, showNotification]);

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
    <div className="app-container">
      <Notification message={notification} />
      <Navbar />

      <div className="main-content">
        <div className="left-panel">
          <CodeEditor
            code={code}
            onChange={setCode}
            onRun={handleRun}
            onCopy={handleCopy}
            onExport={handleExport}
          />
          <OutputTerminal
            output={output}
            onClear={handleClear}
            onStop={handleStop}
            isRunning={isRunning}
            code={code}
            onStatusUpdate={showNotification}
            onError={showNotification}
          />
        </div>

        <div className="right-panel">
          <TurtleWorkspace
            background={background}
            onBackgroundChange={setBackground}
          />
        </div>
      </div>
    </div>
  );
}
