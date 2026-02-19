"use client";

import { OBO_CODE_CONFIG } from "@nexus-tools/monaco-editor";
import { Button } from "@nexus-tools/ui";
import { CopyOutlined, ExportOutlined, PlayCircleOutlined } from "@ant-design/icons";
import dynamic from "next/dynamic";
import { useCallback } from "react";

const MonacoCodeEditorComponent = dynamic(
  () => import("@nexus-tools/monaco-editor").then((mod) => ({ default: mod.MonacoCodeEditor })),
  {
    ssr: false,
    loading: () => <div className="code-editor-loading">Loading editor...</div>,
  }
);

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  onRun: () => void;
  onCopy: () => void;
  onExport: () => void;
}

export function CodeEditor({
  code,
  onChange,
  onRun,
  onCopy,
  onExport,
}: CodeEditorProps) {
  const handleChange = useCallback(
    (value: string) => {
      onChange(value);
    },
    [onChange]
  );

  return (
    <div className="code-panel">
      <div className="panel-header">
        <span className="panel-title">Python Code</span>
        <div className="button-group" style={{ display: "flex", gap: "8px" }}>
          <Button
            variant="default"
            icon={<PlayCircleOutlined />}
            onClick={onRun}
            title="Run Python Code (Ctrl+Enter)"
          >
            Run
          </Button>
          <Button
            icon={<CopyOutlined />}
            onClick={onCopy}
            title="Copy Code to Clipboard"
          >
            Copy
          </Button>
          <Button
            icon={<ExportOutlined />}
            onClick={onExport}
            title="Export Code"
          >
            Export
          </Button>
        </div>
      </div>
      <div className="code-editor-wrapper">
        <MonacoCodeEditorComponent
          code={code}
          onChange={handleChange}
          language={OBO_CODE_CONFIG.language}
          theme={OBO_CODE_CONFIG.theme}
          height="100%"
          showMinimap={OBO_CODE_CONFIG.showMinimap}
        />
      </div>
    </div>
  );
}
