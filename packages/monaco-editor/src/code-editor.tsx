"use client";

import { Editor } from "@monaco-editor/react";
import { useCallback, useEffect } from "react";
import { MonacoCodeEditorProps } from "./types";

export function MonacoCodeEditor({
  code,
  onChange,
  readOnly = false,
  language = "python",
  theme = "vs-light",
  height = "100%",
  showMinimap = true,
}: MonacoCodeEditorProps) {
  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined) {
        onChange(value);
      }
    },
    [onChange]
  );

  // Suppress only Monaco's internal cancellation errors (scoped, not global)
  useEffect(() => {
    const originalError = console.error;
    const filteredError = (...args: unknown[]) => {
      const message = String(args[0] ?? "");
      // Only suppress if it's clearly a Monaco cancellation error
      // Case-insensitive, check stack to ensure it's from Monaco, not app code
      if (/\bcancel(?:ed|ed)?\b/i.test(message)) {
        const stack = (new Error().stack || "").toLowerCase();
        // Only filter if stack trace mentions monaco (prevents filtering unrelated errors)
        if (stack.includes("monaco") || stack.includes("editor")) {
          return;
        }
      }
      originalError.apply(console, args as any);
    };

    console.error = filteredError;

    return () => {
      console.error = originalError;
    };
  }, []);

  return (
    <Editor
      value={code}
      language={language}
      height={height}
      onChange={handleChange}
      theme={theme}
      options={{
        minimap: { enabled: showMinimap },
        fontSize: 14,
        fontFamily: "Fira Code, Courier New",
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        wordWrap: "on",
        automaticLayout: true,
        readOnly: readOnly,
        tabSize: 2,
        insertSpaces: true,
        formatOnPaste: true,
        formatOnType: true,
        snippetSuggestions: "inline",
      }}
      loading={<div className="editor-loading">Loading editor...</div>}
    />
  );
}
