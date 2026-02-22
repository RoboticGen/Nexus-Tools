"use client";

import { CopyOutlined, ExportOutlined, PlayCircleOutlined, EditOutlined, SaveOutlined } from "@ant-design/icons";


import { Button } from "./button";
import { SharedCodeEditor } from "./shared-code-editor";

import type { SharedCodeEditorHandle } from "./shared-code-editor";
import type { RefObject } from "react";

interface SharedCodePanelProps {
  /** Python code content */
  code: string;
  /** Whether editor is in editing mode */
  isEditing?: boolean;
  /** Callback when code changes */
  onCodeChange: (code: string) => void;
  /** Callback when edit toggle is clicked */
  onEditToggle?: (editing: boolean) => void;
  /** Callback when run button is clicked */
  onRun?: () => void;
  /** Callback when copy button is clicked */
  onCopy?: () => void;
  /** Callback when export button is clicked */
  onExport?: () => void;
  /** Callback when save to device button is clicked */
  onSaveToDevice?: (filename: string, content: string) => void;
  /** Whether device is connected (for Save Device button) */
  isConnected?: boolean;
  /** Ref for code editor handle */
  codeEditorRef?: RefObject<SharedCodeEditorHandle>;
  /** Callback when the active editor tab (file) changes – e.g. to highlight in file manager */
  onActiveTabChange?: (filename: string) => void;
  /** Monaco editor language (default: 'python') */
  language?: string;
  /** Monaco editor theme (default: 'vs-dark') */
  theme?: string;
  /** Whether to show minimap (default: false) */
  showMinimap?: boolean;
  /** Panel title (default: 'Python Code') */
  title?: string;
  /** CSS class name (default: 'code') */
  className?: string;
  /** Show edit button (default: true) */
  showEditButton?: boolean;
  /** Show run button (default: true) */
  showRunButton?: boolean;
  /** Show copy button (default: true) */
  showCopyButton?: boolean;
  /** Show export button (default: true) */
  showExportButton?: boolean;
  /** Show save device button (default: true) */
  showSaveDeviceButton?: boolean;
}

/**
 * Shared Code Panel with editor and action buttons.
 * Used in both obo-code and obo-blocks applications.
 */
export function SharedCodePanel({
  code,
  isEditing = false,
  onCodeChange,
  onEditToggle,
  onRun,
  onCopy,
  onExport,
  onSaveToDevice,
  isConnected = false,
  codeEditorRef,
  onActiveTabChange,
  language = "python",
  theme = "vs-light",
  showMinimap = false,
  title = "Python Code",
  className = "code",
  showEditButton = true,
  showRunButton = true,
  showCopyButton = true,
  showExportButton = true,
  showSaveDeviceButton = true,
}: SharedCodePanelProps) {
  const handleSaveToDevice = () => {
    if (!code.trim()) {
      return;
    }
    // Get the active tab name from the code editor
    const filename = codeEditorRef?.current?.getActiveTabName() || "main.py";
    console.log("Saving to device with filename:", filename);
    onSaveToDevice?.(filename, code);
  };

  return (
    <div className={className} id={className}>
      <div className="button-row">
        <p className="code-title">{title}</p>
        <div className="button-group" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {showEditButton && onEditToggle && (
            <Button
              variant={isEditing ? "default" : "default"}
              icon={<EditOutlined />}
              onClick={() => onEditToggle(!isEditing)}
              title={isEditing ? "Stop Editing" : "Edit Code"}
            >
              {isEditing ? "Editing" : "Edit"}
            </Button>
          )}
          {showRunButton && onRun && (
            <Button
              variant="default"
              icon={<PlayCircleOutlined />}
              onClick={onRun}
              title="Run Python Code"
            >
              Run
            </Button>
          )}
          {showCopyButton && onCopy && (
            <Button
              icon={<CopyOutlined />}
              onClick={onCopy}
              title="Copy Code to Clipboard"
            >
              Copy
            </Button>
          )}
          {showExportButton && onExport && (
            <Button
              icon={<ExportOutlined />}
              onClick={onExport}
              title="Export Code"
            >
              Export
            </Button>
          )}
          {showSaveDeviceButton && onSaveToDevice && (
            <Button
              icon={<SaveOutlined />}
              onClick={handleSaveToDevice}
              title={isConnected ? "Save to ESP32 Device" : "Connect device first"}
              disabled={!isConnected}
            >
              Save Device
            </Button>
          )}
        </div>
      </div>
      <div className="code-snippet" id="code-editor">
        <SharedCodeEditor 
          ref={codeEditorRef} 
          code={code} 
          onChange={onCodeChange} 
          onActiveTabChange={onActiveTabChange}
          readOnly={!isEditing} 
          language={language}
          theme={theme}
          showMinimap={showMinimap}
        />
      </div>
    </div>
  );
}
