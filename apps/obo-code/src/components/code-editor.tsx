"use client";

import { useCallback } from "react";
import dynamic from "next/dynamic";
import { python } from "@codemirror/lang-python";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
  loading: () => <div className="code-editor-loading">Loading editor...</div>,
});

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
          <button className="action-btn run-btn" onClick={onRun}>
            <i className="fa fa-flag" />
            <span>Run</span>
          </button>
          <button className="action-btn copy-btn" onClick={onCopy}>
            <i className="fa fa-copy" />
            <span>Copy</span>
          </button>
          <button className="action-btn export-btn" onClick={onExport}>
            <i className="fa fa-file-export" />
            <span>Export</span>
          </button>
        </div>
      </div>
      <div className="code-editor-wrapper">
        <CodeMirror
          value={code}
          height="100%"
          extensions={[python()]}
          onChange={handleChange}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightSpecialChars: true,
            foldGutter: true,
            drawSelection: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            syntaxHighlighting: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            defaultKeymap: true,
            searchKeymap: true,
            historyKeymap: true,
            foldKeymap: true,
            completionKeymap: true,
            lintKeymap: true,
          }}
        />
      </div>
    </div>
  );
}
