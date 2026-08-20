import { usePyodideRunner } from "@nexus-tools/pyodide-executor";
import { useCallback } from "react";

/** Editor/toolbar actions for the obo-blocks workspace. Python output used to travel outside React entirely: `src/pyodide/loader.ts` appended it to `document.getElementById("terminal-output").value`, and `handleClearTerminal` reached for the same node to reset it. */
export function useBlocklyHandlers(
  code: string,
  _isEditing: boolean,
  showNotification: (message: string) => void,
  copyTextToClipboard: (text: string) => Promise<void>,
  downloadPythonFile: (content: string, filename: string) => void
) {
  const { runCode, stopCode, isRunning, output, clearOutput } = usePyodideRunner({
    onError: showNotification,
  });

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
    runCode(code);
    showNotification("Code execution started");
  }, [code, runCode, showNotification]);

  const handleClearTerminal = useCallback(() => {
    clearOutput();
    showNotification("Terminal cleared");
  }, [clearOutput, showNotification]);

  const handleStopCode = useCallback(() => {
    stopCode();
    showNotification("Code execution stopped");
  }, [stopCode, showNotification]);

  return {
    handleEditToggle,
    handleCopy,
    handleExport,
    handleRunCode,
    handleClearTerminal,
    handleStopCode,
    isRunning,
    output,
  };
}
