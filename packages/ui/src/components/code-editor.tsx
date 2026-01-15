"use client";

import { useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  onRun: () => void;
  onCopy: () => void;
  onExport: () => void;
  language?: "python" | "javascript" | "typescript";
  readOnly?: boolean;
  theme?: "light" | "dark";
  height?: string;
}

// Dynamically import Monaco editor to avoid SSR issues
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-gray-100 dark:bg-gray-900">
      <span className="text-gray-500">Loading editor...</span>
    </div>
  ),
});

export function CodeEditor({
  code,
  onChange,
  onRun,
  onCopy,
  onExport,
  language = "python",
  readOnly = false,
  theme = "dark",
  height = "100%",
}: CodeEditorProps) {
  const editorRef = useRef<any>(null);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined) {
        onChange(value);
      }
    },
    [onChange]
  );

  const handleEditorMount = useCallback((editor: any) => {
    editorRef.current = editor;
    // Apply keyboard shortcuts
    editor.addCommand(
      2048 + 65,
      () => {
        // Ctrl+A
        editor.setSelection(editor.getModel().getFullModelRange());
      },
      "editorTextFocus"
    );
  }, []);

  const handleCopy = useCallback(() => {
    if (editorRef.current) {
      const selectedCode = editorRef.current.getSelectedText();
      const textToCopy = selectedCode || code;
      navigator.clipboard.writeText(textToCopy);
      onCopy?.();
    }
  }, [code, onCopy]);

  const monacoOptions = {
    minimap: { enabled: true },
    fontSize: 14,
    lineHeight: 20,
    padding: { top: 16, bottom: 16 },
    formatOnPaste: true,
    formatOnType: true,
    autoIndent: "full" as const,
    tabSize: 4,
    wordWrap: "on" as const,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    readOnly,
  };

  return (
    <div className={`flex flex-col w-full h-full rounded-lg border ${theme === "light" ? "bg-white border-gray-200" : "bg-gray-950 border-gray-800"}`}>
      {(onRun || onCopy || onExport) && (
        <div className={`flex items-center justify-between px-4 py-3 border-b ${theme === "light" ? "border-gray-200 bg-white" : "border-gray-800 bg-gray-900"}`}>
          <span className={`text-sm font-semibold ${theme === "light" ? "text-gray-800" : "text-gray-300"}`}>
            {language === "python" ? "Python Code" : "Code"}
          </span>
          <div className="button-group">
            {onRun && (
              <button
                onClick={onRun}
                className="action-btn run-btn"
                title="Run code (Ctrl+Enter)"
              >
                <i className="fa fa-flag" />
                <span>Run</span>
              </button>
            )}
            {onCopy && (
              <button
                onClick={handleCopy}
                className="action-btn copy-btn"
                title="Copy code"
              >
                <i className="fa fa-copy" />
                <span>Copy</span>
              </button>
            )}
            {onExport && (
              <button
                onClick={onExport}
                className="action-btn export-btn"
                title="Export code"
              >
                <i className="fa fa-file-export" />
                <span>Export</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          height={height}
          language={language}
          value={code}
          onChange={handleChange}
          onMount={handleEditorMount}
          theme={theme === "dark" ? "vs-dark" : "vs"}
          options={monacoOptions}
        />
      </div>
    </div>
  );
}
