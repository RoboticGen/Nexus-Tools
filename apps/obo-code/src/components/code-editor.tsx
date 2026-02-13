"use client";

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
        <div className="button-group">
          <button className="action-btn run-btn" onClick={onRun} title="Run Python Code">
            <i className="fa fa-flag" />
            <span>Run</span>
          </button>
          <button className="action-btn copy-btn" onClick={onCopy} title="Copy Code">
            <i className="fa fa-copy" />
            <span>Copy</span>
          </button>
          <button className="action-btn export-btn" onClick={onExport} title="Export Code">
            <i className="fa fa-file-export" />
            <span>Export</span>
          </button>
        </div>
      </div>
      <div className="code-editor-wrapper">
        <MonacoCodeEditorComponent
          code={code}
          onChange={handleChange}
          language="python"
          theme="vs-light"
          height="100%"
          showMinimap={true}
        />
      </div>
    </div>
  );
}
