"use client";

import { CopyOutlined, ExportOutlined, PlayCircleOutlined, EditOutlined, SaveOutlined } from "@ant-design/icons";
import { Button } from "@nexus-tools/ui";
import { RefObject } from "react";

import { CodeEditor, CodeEditorHandle } from "./code-editor";

interface CodePanelProps {
  code: string;
  isEditing: boolean;
  onCodeChange: (code: string) => void;
  onEditToggle: (editing: boolean) => void;
  onRun: () => void;
  onCopy: () => void;
  onExport: () => void;
  onSaveToDevice?: (filename: string, content: string) => void;
  isConnected?: boolean;
  codeEditorRef?: RefObject<CodeEditorHandle>;
}

export function CodePanel({
  code,
  isEditing,
  onCodeChange,
  onEditToggle,
  onRun,
  onCopy,
  onExport,
  onSaveToDevice,
  isConnected = false,
  codeEditorRef,
}: CodePanelProps) {
  const handleSaveToDevice = () => {
    if (!code.trim()) {
      return;
    }
    onSaveToDevice?.("main.py", code);
  };

  return (
    <div className="code" id="code">
      <div className="button-row">
        <p className="code-title">Python Code</p>
        <div className="button-group" style={{ display: "flex", gap: "8px" }}>
          <Button
            variant={isEditing ? "default" : "default"}
            icon={<EditOutlined />}
            onClick={() => onEditToggle(!isEditing)}
            title={isEditing ? "Stop Editing" : "Edit Code"}
          >
            {isEditing ? "Editing" : "Edit"}
          </Button>
          <Button
            variant="default"
            icon={<PlayCircleOutlined />}
            onClick={onRun}
            title="Run Python Code"
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
          <Button
            icon={<SaveOutlined />}
            onClick={handleSaveToDevice}
            title={isConnected ? "Save to ESP32 Device" : "Connect device first"}
            disabled={!isConnected}
          >
            Save Device
          </Button>
        </div>
      </div>
      <div className="code-snippet" id="code-editor">
        <CodeEditor 
          ref={codeEditorRef} 
          code={code} 
          onChange={onCodeChange} 
          readOnly={!isEditing} 
        />
      </div>
    </div>
  );
}
