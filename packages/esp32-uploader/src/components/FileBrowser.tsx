/**
 * File Browser Component for ESP32
 * Displays file tree, allows operations like upload/download/delete
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useFileManager } from '../hooks/use-file-manager';
import type { FileSystemNode } from '../types/file-manager';
import '../styles/file-browser.css';

interface FileBrowserProps {
  serialPort: any;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
}

export function FileBrowser({
  serialPort,
  onConnected,
  onDisconnected,
  onError,
}: FileBrowserProps) {
  const {
    state,
    connect,
    disconnect,
    readFile,
    writeFile,
    deleteFile,
    mkdir,
    refresh,
    clearOperations,
  } = useFileManager(serialPort);

  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Initialize connection
   */
  const handleConnect = useCallback(async () => {
    try {
      await connect({ softReboot: false });
      onConnected?.();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      onError?.(msg);
    }
  }, [connect, onConnected, onError]);

  /**
   * Close connection
   */
  const handleDisconnect = useCallback(async () => {
    await disconnect();
    onDisconnected?.();
  }, [disconnect, onDisconnected]);

  /**
   * Refresh file list
   */
  const handleRefresh = useCallback(async () => {
    try {
      await refresh();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      onError?.(msg);
    }
  }, [refresh, onError]);

  /**
   * Download file
   */
  const handleDownloadFile = useCallback(
    async (filepath: string) => {
      try {
        const data = await readFile(filepath);

        const blob = new Blob([data], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filepath.split('/').pop() || 'file';
        link.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        onError?.(msg);
      }
    },
    [readFile, onError]
  );

  /**
   * Upload file
   */
  const handleUploadFile = useCallback(
    async (file: File, destPath: string) => {
      try {
        const buffer = await file.arrayBuffer();
        const data = new Uint8Array(buffer);
        const filepath = destPath.endsWith('/') ? destPath + file.name : destPath;
        await writeFile(filepath, data);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        onError?.(msg);
      }
    },
    [writeFile, onError]
  );

  /**
   * Delete file
   */
  const handleDeleteFile = useCallback(
    async (filepath: string) => {
      if (confirm(`Delete ${filepath}?`)) {
        try {
          await deleteFile(filepath);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          onError?.(msg);
        }
      }
    },
    [deleteFile, onError]
  );

  /**
   * Create directory
   */
  const handleCreateDir = useCallback(async () => {
    const dirPath = prompt('Enter directory path:');
    if (dirPath) {
      try {
        await mkdir(dirPath);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        onError?.(msg);
      }
    }
  }, [mkdir, onError]);

  /**
   * Toggle directory expansion
   */
  const handleToggleDir = useCallback((path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  /**
   * Format file size
   */
  const formatSize = (bytes?: number): string => {
    if (bytes === undefined) return '';
    const units = ['B', 'KiB', 'MiB', 'GiB'];
    let size = bytes;
    let unitIdx = 0;
    while (size > 1024 && unitIdx < units.length - 1) {
      size /= 1024;
      unitIdx++;
    }
    return `${size.toFixed(1)} ${units[unitIdx]}`;
  };

  /**
   * Render file tree node
   */
  const renderNode = (node: FileSystemNode, level: number = 0) => {
    const isExpanded = expandedDirs.has(node.path);
    const hasChildren = node.type === 'directory' && node.content && node.content.length > 0;

    return (
      <div key={node.path} className="file-tree-item" style={{ marginLeft: `${level * 20}px` }}>
        <div className="file-tree-row">
          {node.type === 'directory' && (
            <button
              className="expand-btn"
              onClick={() => handleToggleDir(node.path)}
              disabled={!hasChildren}
            >
              {hasChildren ? (isExpanded ? '▼' : '▶') : '○'}
            </button>
          )}
          {node.type === 'file' && <span className="file-icon">📄</span>}
          {node.type === 'directory' && <span className="dir-icon">📁</span>}

          <span className="file-name">{node.name}</span>
          {node.size !== undefined && <span className="file-size">{formatSize(node.size)}</span>}

          {node.type === 'file' && (
            <div className="file-actions">
              <button
                className="action-btn"
                onClick={() => handleDownloadFile(node.path)}
                title="Download"
              >
                ⬇
              </button>
              <button
                className="action-btn delete"
                onClick={() => handleDeleteFile(node.path)}
                title="Delete"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {isExpanded && hasChildren && (
          <div className="file-tree-children">
            {node.content?.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="file-browser">
      <div className="file-browser-header">
        <h2>File Manager</h2>
        <div className="connection-status">
          {state.connected ? (
            <span className="status-connected">● Connected</span>
          ) : (
            <span className="status-disconnected">● Disconnected</span>
          )}
        </div>
      </div>

      {/* Connection Controls */}
      <div className="file-browser-controls">
        {!state.connected ? (
          <button className="btn btn-primary" onClick={handleConnect}>
            Connect
          </button>
        ) : (
          <button className="btn btn-danger" onClick={handleDisconnect}>
            Disconnect
          </button>
        )}

        {state.connected && (
          <>
            <button className="btn" onClick={handleRefresh}>
              Refresh
            </button>
            <button className="btn" onClick={handleCreateDir}>
              New Folder
            </button>
            <button
              className="btn"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleUploadFile(file, state.currentPath);
                  e.target.value = '';
                }
              }}
              style={{ display: 'none' }}
            />
          </>
        )}
      </div>

      {/* Device Info */}
      {state.deviceInfo && state.connected && (
        <div className="device-info">
          <div className="info-item">
            <label>Device:</label>
            <span>{state.deviceInfo.machine}</span>
          </div>
          <div className="info-item">
            <label>Version:</label>
            <span>{state.deviceInfo.version}</span>
          </div>
        </div>
      )}

      {/* Filesystem Stats */}
      {state.stats && state.connected && (
        <div className="fs-stats">
          <div className="stat-item">
            <label>Used:</label>
            <span>{formatSize(state.stats.used)}</span>
          </div>
          <div className="stat-item">
            <label>Free:</label>
            <span>{formatSize(state.stats.free)}</span>
          </div>
          <div className="stat-item">
            <label>Total:</label>
            <span>{formatSize(state.stats.total)}</span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {state.error && (
        <div className="error-message">
          <strong>Error:</strong> {state.error}
          <button onClick={() => clearOperations()}>Dismiss</button>
        </div>
      )}

      {/* File Tree */}
      {state.connected && state.files.length > 0 && (
        <div className="file-tree">
          <div className="file-tree-header">Files and Directories</div>
          <div className="file-tree-content">
            {state.files.map((node) => renderNode(node))}
          </div>
        </div>
      )}

      {state.connected && state.files.length === 0 && !state.error && (
        <div className="empty-state">No files or directories found</div>
      )}

      {/* Operations Progress */}
      {state.operations.length > 0 && (
        <div className="operations-panel">
          {state.operations.map((op, idx) => (
            <div key={idx} className={`operation-item ${op.status}`}>
              <span className="op-type">{op.type}</span>
              <span className="op-path">{op.filepath}</span>
              <span className="op-progress">{op.progress}%</span>
              {op.error && <span className="op-error">{op.error}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
