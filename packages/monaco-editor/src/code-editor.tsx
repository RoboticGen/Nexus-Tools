"use client";

import { Editor } from "@monaco-editor/react";
import { useCallback } from "react";
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
