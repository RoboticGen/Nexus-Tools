import { useCallback } from "react";

export function useBlocklyHandlers(
  code: string,
  _isEditing: boolean,
  showNotification: (message: string) => void,
  copyTextToClipboard: (text: string) => Promise<void>,
  downloadPythonFile: (content: string, filename: string) => void
) {
  const handleEditToggle = useCallback(
    (editing: boolean) => {
      showNotification(editing ? "Editing enabled" : "Editing disabled");
    },
    [showNotification]
  );

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
    if (typeof window !== "undefined") {
      try {
        const workerModule = require("@/pyodide/loader");
        const workerInstance = workerModule.getWorker();
        if (workerInstance) {
          workerInstance.postMessage({ code: code, command: "run" });
          showNotification("Code execution started");
        } else {
          showNotification("Worker is not available");
        }
      } catch (err) {
        console.error("Error running code:", err);
        showNotification(`Error: ${err}`);
      }
    }
  }, [code, showNotification]);

  const handleClearTerminal = useCallback(() => {
    const terminal = document.getElementById(
      "terminal-output"
    ) as HTMLTextAreaElement;
    if (terminal) {
      terminal.value = "Python 3.10\n>>> ";
    }
    showNotification("Terminal cleared");
  }, [showNotification]);

  const handleStopCode = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        const workerModule = require("@/pyodide/loader");
        if (
          workerModule.stopWorker &&
          typeof workerModule.stopWorker === "function"
        ) {
          workerModule.stopWorker();
        }
      } catch (err) {
        console.error("Error stopping code:", err);
      }
    }
    showNotification("Code execution stopped");
  }, [showNotification]);

  return {
    handleEditToggle,
    handleCopy,
    handleExport,
    handleRunCode,
    handleClearTerminal,
    handleStopCode,
  };
}
