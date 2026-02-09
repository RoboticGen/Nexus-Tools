import { useCallback } from "react";

export function useEditorHandlers() {
  const copyTextToClipboard = useCallback(async (textToCopy: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      }
    } catch (err) {
      console.error("Error copying text to clipboard:", err);
    }
  }, []);

  const downloadPythonFile = useCallback((content: string, filename: string) => {
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(content)
    );
    element.setAttribute("download", filename);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }, []);

  const downloadJsonFile = useCallback((content: string, filename: string) => {
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:application/json;charset=utf-8," + encodeURIComponent(content)
    );
    element.setAttribute("download", filename);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }, []);

  return {
    copyTextToClipboard,
    downloadPythonFile,
    downloadJsonFile,
  };
}
