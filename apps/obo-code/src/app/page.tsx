"use client";


import { CodeEditor } from "@nexus-tools/ui";
import { useState, useCallback } from "react";

import { Navbar } from "@/components/navbar";
import { Notification } from "@/components/notification";
import { OutputTerminal } from "@/components/output-terminal";
import { TurtleWorkspace } from "@/components/turtle-workspace";
import { usePythonRunner } from "@/hooks/use-python-runner";

const DEFAULT_CODE = `import turtle
colors = ['red', 'purple', 'blue', 'green', 'orange', 'yellow']
t = turtle.Turtle()
for x in range(360):
    t.pencolor(colors[x%6])
    t.width(x//100 + 1)
    t.forward(x)
    t.left(59)
`;

export default function Home() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [notification, setNotification] = useState<string | null>(null);
  const [background, setBackground] = useState<string>("No-Background");

  const showNotification = useCallback((message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 1500);
  }, []);

  const { runCode, stopCode, isRunning, output, clearOutput } = usePythonRunner({
    onError: (error) => showNotification(error),
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
    // Clear canvas
    const canvasElements = document.getElementsByTagName("canvas");
    for (let i = 0; i < canvasElements.length; i++) {
      const context = canvasElements[i].getContext("2d");
      if (context) {
        context.save();
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvasElements[i].width, canvasElements[i].height);
        context.restore();
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
            theme="light"
            language="python"
            showMinimap={false}
          />
          <OutputTerminal
            output={output}
            onClear={handleClear}
            onStop={handleStop}
            isRunning={isRunning}
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
