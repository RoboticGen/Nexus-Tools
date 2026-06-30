/**
 * Device File Manager Sidebar – built from scratch.
 * Single sidebar: expand/collapse, device file list, open in editor, download, delete.
 * Also includes a "Nexus Files" tab for cloud-saved files.
 * All classes are under .device-fm to avoid conflicts.
 */

"use client";

import { useCallback, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { useESP32FileManager } from "../hooks/use-esp32-file-manager";
import { Button, Modal } from "antd";
import {
  SyncOutlined,
  DownloadOutlined,
  DeleteOutlined,
  FolderOutlined,
  FileOutlined,
  LinkOutlined,
  DisconnectOutlined,
  ExclamationCircleOutlined,
  CloudOutlined,
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

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export interface NexusToolFile {
  id: string;
  userEmail: string;
  platform: string;
  fileName: string;
  fileContent: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
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
  /** Called when user clicks connect button */
  onConnect?: () => void;
  /** Called when user clicks disconnect button */
  onDisconnect?: () => void;
  defaultExpanded?: boolean;
  /** Optional class name for the root */
  className?: string;
  /** Nexus Files props – pass these to enable the cloud tab */
  nexusFiles?: NexusToolFile[];
  nexusFilesTotal?: number;
  isNexusFilesLoading?: boolean;
  onNexusFilesRefresh?: () => void;
  onDeleteNexusFile?: (id: string) => Promise<void>;
}

export interface DeviceFileManagerSidebarHandle {
  refreshFiles: () => void;
}

export const DeviceFileManagerSidebar = forwardRef<DeviceFileManagerSidebarHandle, DeviceFileManagerSidebarProps>(
function DeviceFileManagerSidebarComponent({
  serialPort,
  isConnected,
  activeFileName = null,
  onError,
  onOpenFileInEditor,
  onExpandChange,
  onConnect,
  onDisconnect,
  defaultExpanded = true,
  className = "",
  nexusFiles = [],
  isNexusFilesLoading = false,
  onNexusFilesRefresh,
  onDeleteNexusFile,
}: DeviceFileManagerSidebarProps, ref) {
  const { files, isLoading, error, fetchFiles, refreshFiles, downloadFile, viewFile, deleteFile } =
    useESP32FileManager({ serialPort });

  const [expanded, setExpanded] = useState(defaultExpanded);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"device" | "nexus">("device");

  useImperativeHandle(ref, () => ({
    refreshFiles,
  }), [refreshFiles]);

  useEffect(() => {
    if (isConnected && serialPort) fetchFiles("/");
  }, [isConnected, serialPort, fetchFiles]);

  useEffect(() => {
    if (error) onError?.(error);
  }, [error, onError]);

  // Load nexus files when tab becomes active
  useEffect(() => {
    if (activeTab === "nexus" && onNexusFilesRefresh) {
      onNexusFilesRefresh();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

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
      Modal.confirm({
        title: 'Delete File',
        icon: <ExclamationCircleOutlined />,
        content: `Delete "${filename}"? This cannot be undone.`,
        okText: 'Delete',
        okType: 'danger',
        cancelText: 'Cancel',
        onOk: async () => {
          try {
            setLoadingAction(filename);
            await deleteFile(filename);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            onError?.(msg);
          } finally {
            setLoadingAction(null);
          }
        },
      });
    },
    [deleteFile, onError]
  );

  const handleOpenNexusFile = useCallback(
    (file: NexusToolFile) => {
      if (!onOpenFileInEditor) return;
      let content: string;
      const fc = file.fileContent;
      if (typeof fc.code === "string") content = fc.code;
      else if (typeof fc.content === "string") content = fc.content;
      else content = JSON.stringify(fc, null, 2);
      onOpenFileInEditor(file.fileName, content);
    },
    [onOpenFileInEditor]
  );

  const handleDeleteNexusFile = useCallback(
    async (file: NexusToolFile) => {
      Modal.confirm({
        title: 'Delete File',
        icon: <ExclamationCircleOutlined />,
        content: `Delete "${file.fileName}" from Nexus? This cannot be undone.`,
        okText: 'Delete',
        okType: 'danger',
        cancelText: 'Cancel',
        onOk: async () => {
          try {
            setLoadingAction(file.id);
            await onDeleteNexusFile?.(file.id);
            onNexusFilesRefresh?.();
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            onError?.(msg);
          } finally {
            setLoadingAction(null);
          }
        },
      });
    },
    [onDeleteNexusFile, onNexusFilesRefresh, onError]
  );

  const rootClass = [
    "device-fm",
    expanded ? "device-fm--expanded" : "device-fm--collapsed",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const hasNexusTab = onNexusFilesRefresh !== undefined;

  return (
    <aside className={rootClass}>
      <header className="device-fm__header">
        <div
          className="device-fm__header-content"
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
              <span className="device-fm__title">File Manager</span>
            </div>
          )}
        </div>
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
        </div>
      </header>

      {expanded && (
        <div className="device-fm__body">
          {hasNexusTab && (
            <div className="device-fm__tab-nav">
              <button
                className={`device-fm__tab-btn${activeTab === "device" ? " device-fm__tab-btn--active" : ""}`}
                onClick={() => setActiveTab("device")}
              >
                <FolderOutlined /> Device Files
              </button>
              <button
                className={`device-fm__tab-btn${activeTab === "nexus" ? " device-fm__tab-btn--active" : ""}`}
                onClick={() => setActiveTab("nexus")}
              >
                <CloudOutlined /> Nexus Files
              </button>
            </div>
          )}

          <div className="device-fm__tab-content">
            {activeTab === "device" ? (
              <DeviceFilesContent
                isConnected={isConnected}
                isLoading={isLoading}
                files={files}
                error={error}
                activeFileName={activeFileName}
                loadingAction={loadingAction}
                onRefresh={refreshFiles}
                onOpen={handleOpen}
                onDownload={handleDownload}
                onDelete={handleDelete}
              />
            ) : (
              <NexusFilesContent
                files={nexusFiles}
                isLoading={isNexusFilesLoading}
                loadingAction={loadingAction}
                activeFileName={activeFileName}
                onRefresh={onNexusFilesRefresh}
                onOpen={handleOpenNexusFile}
                onDelete={handleDeleteNexusFile}
              />
            )}
          </div>
        </div>
      )}
    </aside>
  );
});

DeviceFileManagerSidebar.displayName = "DeviceFileManagerSidebar";

/* ── Device Files sub-component ── */

interface DeviceFilesContentProps {
  isConnected: boolean;
  isLoading: boolean;
  files: { name: string; size?: number; isDirectory: boolean }[];
  error: string | null;
  activeFileName?: string | null;
  loadingAction: string | null;
  onRefresh: () => void;
  onOpen: (filename: string) => void;
  onDownload: (filename: string) => void;
  onDelete: (filename: string) => void;
}

function DeviceFilesContent({
  isConnected,
  isLoading,
  files,
  error,
  activeFileName,
  loadingAction,
  onRefresh,
  onOpen,
  onDownload,
  onDelete,
}: DeviceFilesContentProps) {
  if (!isConnected) {
    return (
      <div className="device-fm__empty">
        <FolderOutlined />
        <p>Connect to ESP32 to view files</p>
      </div>
    );
  }

  return (
    <>
      <div className="device-fm__toolbar">
        <span className="device-fm__path">/</span>
        <Button
          type="primary"
          size="small"
          icon={<SyncOutlined spin={isLoading} />}
          onClick={onRefresh}
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
                onClick={!file.isDirectory ? () => onOpen(file.name) : undefined}
                role={!file.isDirectory ? "button" : undefined}
                title={!file.isDirectory ? "Open in editor" : undefined}
              >
                <span className="device-fm__item-icon">
                  {file.isDirectory ? <FolderOutlined /> : <FileOutlined />}
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
                      onClick={() => onDownload(file.name)}
                      loading={loading}
                      title="Download"
                      className="device-fm__btn device-fm__btn--download"
                    />
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => onDelete(file.name)}
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
  );
}

/* ── Nexus Files sub-component ── */

interface NexusFilesContentProps {
  files: NexusToolFile[];
  isLoading: boolean;
  loadingAction: string | null;
  activeFileName?: string | null;
  onRefresh?: () => void;
  onOpen: (file: NexusToolFile) => void;
  onDelete: (file: NexusToolFile) => void;
}

function NexusFilesContent({
  files,
  isLoading,
  loadingAction,
  activeFileName,
  onRefresh,
  onOpen,
  onDelete,
}: NexusFilesContentProps) {
  return (
    <>
      <div className="device-fm__toolbar">
        <span className="device-fm__path">Cloud</span>
        <Button
          type="primary"
          size="small"
          icon={<SyncOutlined spin={isLoading} />}
          onClick={onRefresh}
          disabled={isLoading}
          className="device-fm__refresh"
        >
          {isLoading ? "Loading…" : "Refresh"}
        </Button>
      </div>

      {!isLoading && files.length === 0 && (
        <div className="device-fm__empty">
          <CloudOutlined />
          <p>No saved files yet</p>
          <p className="device-fm__empty-hint">Save files from the editor to see them here</p>
        </div>
      )}

      {files.length > 0 && (
        <ul className="device-fm__list">
          {files.map((file) => {
            const isActive =
              !!activeFileName &&
              normalizeName(file.fileName) === normalizeName(activeFileName);
            const loading = loadingAction === file.id;
            return (
              <li
                key={file.id}
                className={`device-fm__item device-fm__item--clickable${isActive ? " device-fm__item--active" : ""}`}
                onClick={() => onOpen(file)}
                role="button"
                title="Open in editor"
              >
                <span className="device-fm__item-icon">
                  <FileOutlined />
                </span>
                <div className="device-fm__item-info">
                  <span className="device-fm__item-name" title={file.fileName}>
                    {file.fileName}
                  </span>
                  <span className="device-fm__item-size device-fm__item-date">
                    {formatDate(file.updatedAt)}
                  </span>
                </div>
                <div className="device-fm__item-actions" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => onDelete(file)}
                    loading={loading}
                    title="Delete from Nexus"
                    className="device-fm__btn device-fm__btn--delete"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
