/**
 * Device File Manager Sidebar – built from scratch.
 * Single sidebar: expand/collapse, device file list, open in editor, download, delete.
 * All classes are under .device-fm to avoid conflicts.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useESP32FileManager } from "../hooks/use-esp32-file-manager";
import { Button } from "antd";
import {
  FileTextOutlined,
  SyncOutlined,
  DownloadOutlined,
  DeleteOutlined,
  FolderOutlined,
  FileOutlined,
  UploadOutlined,
  LinkOutlined,
  DisconnectOutlined,
} from "@ant-design/icons";

function normalizeName(name: string): string {
  return name.replace(/^\/+/, "").trim() || name;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

export interface DeviceFileManagerSidebarProps {
  serialPort: any;
  isConnected: boolean;
  /** Filename currently open in editor – shown in header and highlighted in list */
  activeFileName?: string | null;
  onError?: (error: string) => void;
  onOpenFileInEditor?: (filename: string, content: string) => void;
  /** Called when user expands or collapses – adjust main content margin */
  onExpandChange?: (expanded: boolean) => void;
  /** Called when user clicks uploader icon */
  onUpload?: () => void;
  /** Called when user clicks connect button */
  onConnect?: () => void;
  /** Called when user clicks disconnect button */
  onDisconnect?: () => void;
  defaultExpanded?: boolean;
  /** Optional class name for the root */
  className?: string;
}

export function DeviceFileManagerSidebar({
  serialPort,
  isConnected,
  activeFileName = null,
  onError,
  onOpenFileInEditor,
  onExpandChange,
  onUpload,
  onConnect,
  onDisconnect,
  defaultExpanded = true,
  className = "",
}: DeviceFileManagerSidebarProps) {
  const { files, isLoading, error, fetchFiles, refreshFiles, downloadFile, viewFile, deleteFile } =
    useESP32FileManager({ serialPort });

  const [expanded, setExpanded] = useState(defaultExpanded);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected && serialPort) fetchFiles("/");
  }, [isConnected, serialPort, fetchFiles]);

  useEffect(() => {
    if (error) onError?.(error);
  }, [error, onError]);

  const handleToggle = useCallback(() => {
    const next = !expanded;
    setExpanded(next);
    onExpandChange?.(next);
  }, [expanded, onExpandChange]);

  const handleOpen = useCallback(
    async (filename: string) => {
      if (onOpenFileInEditor) {
        try {
          setLoadingAction(filename);
          const content = await viewFile(filename);
          onOpenFileInEditor(filename, content);
          onError?.(null as any);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          onError?.(msg);
        } finally {
          setLoadingAction(null);
        }
      }
    },
    [viewFile, onOpenFileInEditor, onError]
  );

  const handleDownload = useCallback(
    async (filename: string) => {
      try {
        setLoadingAction(filename);
        await downloadFile(filename);
        onError?.(null as any);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        onError?.(msg);
      } finally {
        setLoadingAction(null);
      }
    },
    [downloadFile, onError]
  );

  const handleDelete = useCallback(
    async (filename: string) => {
      if (!confirm(`Delete "${filename}"? This cannot be undone.`)) return;
      try {
        setLoadingAction(filename);
        await deleteFile(filename);
        onError?.(`Deleted ${filename}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        onError?.(msg);
      } finally {
        setLoadingAction(null);
      }
    },
    [deleteFile, onError]
  );

  const rootClass = [
    "device-fm",
    expanded ? "device-fm--expanded" : "device-fm--collapsed",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <aside className={rootClass}>
      <header 
        className="device-fm__header"
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleToggle(); }}
      >
        {!expanded && (
          <span className="device-fm__label-vertical" aria-hidden>File Manager</span>
        )}
        {expanded && (
          <div className="device-fm__title-wrap">
            <span className="device-fm__title">Device Files</span>
            {activeFileName && (
              <div className="device-fm__badge" title={`Open in editor: ${activeFileName}`}>
                <FileTextOutlined />
                <span className="device-fm__badge-name">{activeFileName}</span>
              </div>
            )}
          </div>
        )}
        <div className="device-fm__header-actions">
          {isConnected ? (
            <Button
              type="text"
              icon={<DisconnectOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onDisconnect?.();
              }}
              title="Disconnect device"
              className="device-fm__connect-btn"
              style={{ color: "#dc2626" }}
            />
          ) : (
            <Button
              type="text"
              icon={<LinkOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onConnect?.();
              }}
              title="Connect device"
              className="device-fm__connect-btn"
              style={{ color: "#059669" }}
            />
          )}
          <Button
            type="text"
            icon={<UploadOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onUpload?.();
            }}
            title="Upload firmware"
            className="device-fm__upload-btn"
            disabled={!isConnected}
          />
        </div>
      </header>

      {expanded && (
        <div className="device-fm__body">
          {!isConnected ? (
            <div className="device-fm__empty">
              <FolderOutlined />
              <p>Connect to ESP32 to view files</p>
            </div>
          ) : (
            <>
              <div className="device-fm__toolbar">
                <span className="device-fm__path">/</span>
                <Button
                  type="primary"
                  size="small"
                  icon={<SyncOutlined spin={isLoading} />}
                  onClick={() => refreshFiles()}
                  disabled={isLoading}
                  className="device-fm__refresh"
                >
                  {isLoading ? "Refreshing…" : "Refresh"}
                </Button>
              </div>

              {error && (
                <div className="device-fm__error">
                  <span>{error}</span>
                </div>
              )}

              {!isLoading && files.length === 0 && !error && (
                <div className="device-fm__empty">
                  <FolderOutlined />
                  <p>No files on device</p>
                </div>
              )}

              {files.length > 0 && (
                <ul className="device-fm__list">
                  {files.map((file) => {
                    const isActive =
                      !!activeFileName &&
                      !file.isDirectory &&
                      normalizeName(file.name) === normalizeName(activeFileName);
                    const loading = loadingAction === file.name;
                    return (
                      <li
                        key={file.name}
                        className={`device-fm__item${isActive ? " device-fm__item--active" : ""}${!file.isDirectory ? " device-fm__item--clickable" : ""}`}
                        onClick={
                          !file.isDirectory
                            ? () => handleOpen(file.name)
                            : undefined
                        }
                        role={!file.isDirectory ? "button" : undefined}
                        title={!file.isDirectory ? "Open in editor" : undefined}
                      >
                        <span className="device-fm__item-icon">
                          {file.isDirectory ? (
                            <FolderOutlined />
                          ) : (
                            <FileOutlined />
                          )}
                        </span>
                        <div className="device-fm__item-info">
                          <span className="device-fm__item-name" title={file.name}>
                            {file.name}
                          </span>
                          {file.size != null && (
                            <span className="device-fm__item-size">{formatSize(file.size)}</span>
                          )}
                        </div>
                        {!file.isDirectory && (
                          <div className="device-fm__item-actions" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="small"
                              icon={<DownloadOutlined />}
                              onClick={() => handleDownload(file.name)}
                              loading={loading}
                              title="Download"
                              className="device-fm__btn device-fm__btn--download"
                            />
                            <Button
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => handleDelete(file.name)}
                              loading={loading}
                              title="Delete"
                              className="device-fm__btn device-fm__btn--delete"
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </aside>
  );
}
