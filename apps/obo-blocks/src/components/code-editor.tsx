"use client";

import dynamic from "next/dynamic";
import { useCallback } from "react";

const MonacoCodeEditorComponent = dynamic(
  () => import("@nexus-tools/monaco-editor").then((mod) => ({ default: mod.MonacoCodeEditor })),
  {
    ssr: false,
    loading: () => <div style={{ height: "100%", padding: "1rem" }}>Loading editor...</div>,
  }
);

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  readOnly?: boolean;
}

export function CodeEditor({
  code,
  onChange,
  readOnly = false,
}: CodeEditorProps) {
  const handleChange = useCallback(
    (value: string) => {
      onChange(value);
    },
    [onChange]
  );

  return (
    <div style={{ height: "100%", width: "100%", overflow: "hidden" }}>
      <MonacoCodeEditorComponent
        code={code}
        onChange={handleChange}
        readOnly={readOnly}
        language="python"
        theme="vs-light"
        height="100%"
        showMinimap={true}
      />
    </div>
  );
}
