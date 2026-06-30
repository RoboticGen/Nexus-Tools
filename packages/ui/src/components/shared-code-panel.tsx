"use client";

import {
  CopyOutlined,
  ExportOutlined,
  PlayCircleOutlined,
  EditOutlined,
  SaveOutlined,
  ThunderboltOutlined,
  CloudUploadOutlined,
} from "@ant-design/icons";
import { Tooltip } from "antd";

import { Button } from "./button";
import { SharedCodeEditor } from "./shared-code-editor";

import type { SharedCodeEditorHandle } from "./shared-code-editor";
import type { RefObject } from "react";

interface SharedCodePanelProps {
  code: string;
  isEditing?: boolean;
  onCodeChange: (code: string) => void;
  onEditToggle?: (editing: boolean) => void;
  onRun?: () => void;
  onRunInESP32?: () => void;
  onCopy?: () => void;
  onExport?: () => void;
  onSaveToDevice?: (filename: string, content: string) => void;
  onSaveToNexus?: (filename: string, content: string) => void;
  isConnected?: boolean;
  codeEditorRef?: RefObject<SharedCodeEditorHandle>;
  onActiveTabChange?: (filename: string) => void;
  language?: string;
  theme?: string;
  showMinimap?: boolean;
  title?: string;
  className?: string;
  showEditButton?: boolean;
  showRunButton?: boolean;
  showRunInESP32Button?: boolean;
  showCopyButton?: boolean;
  showExportButton?: boolean;
  showSaveDeviceButton?: boolean;
  showSaveNexusButton?: boolean;
}

export function SharedCodePanel({
  code,
  isEditing = false,
  onCodeChange,
  onEditToggle,
  onRun,
  onRunInESP32,
  onCopy,
  onExport,
  onSaveToDevice,
  onSaveToNexus,
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
  showRunInESP32Button = true,
  showCopyButton = true,
  showExportButton = true,
  showSaveDeviceButton = true,
  showSaveNexusButton = true,
}: SharedCodePanelProps) {
  const getFilename = () =>
    codeEditorRef?.current?.getActiveTabName() || "main.py";

  const handleSaveToDevice = () => {
    if (!code.trim()) return;
    onSaveToDevice?.(getFilename(), code);
  };

  const handleSaveToNexus = () => {
    if (!code.trim()) return;
    onSaveToNexus?.(getFilename(), code);
  };

  return (
    <div className={className} id={className}>
      <div className="button-row">
        <p className="code-title">{title}</p>

        <div className="panel-toolbar">
          {showEditButton && onEditToggle && (
            <Tooltip title={isEditing ? "Stop Editing" : "Edit Code"} placement="bottom">
              <Button
                size="sm"
                icon={<EditOutlined />}
                onClick={() => onEditToggle(!isEditing)}
              />
            </Tooltip>
          )}

          {showRunButton && onRun && (
            <Tooltip title="Run" placement="bottom">
              <Button
                size="sm"
                icon={<PlayCircleOutlined />}
                onClick={onRun}
              />
            </Tooltip>
          )}

          {showRunInESP32Button && onRunInESP32 && (
            <Tooltip
              title={isConnected ? "Run in ESP32" : "Connect device to run in ESP32"}
              placement="bottom"
            >
              <span>
                <Button
                  size="sm"
                  icon={<ThunderboltOutlined />}
                  onClick={onRunInESP32}
                  disabled={!isConnected}
                  className="btn-run-esp32"
                />
              </span>
            </Tooltip>
          )}

          {showCopyButton && onCopy && (
            <Tooltip title="Copy code" placement="bottom">
              <Button
                size="sm"
                icon={<CopyOutlined />}
                onClick={onCopy}
              />
            </Tooltip>
          )}

          {showExportButton && onExport && (
            <Tooltip title="Export as .py" placement="bottom">
              <Button
                size="sm"
                icon={<ExportOutlined />}
                onClick={onExport}
              />
            </Tooltip>
          )}

          {showSaveDeviceButton && onSaveToDevice && (
            <Tooltip
              title={isConnected ? "Save to device" : "Connect device to save"}
              placement="bottom"
            >
              <span>
                <Button
                  size="sm"
                  icon={<SaveOutlined />}
                  onClick={handleSaveToDevice}
                  disabled={!isConnected}
                  className="btn-save-device"
                />
              </span>
            </Tooltip>
          )}

          {showSaveNexusButton && onSaveToNexus && (
            <Tooltip title="Save to Nexus" placement="bottom">
              <Button
                size="sm"
                icon={<CloudUploadOutlined />}
                onClick={handleSaveToNexus}
                className="btn-save-nexus"
              />
            </Tooltip>
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
