/**
 * ESP32 File Manager Component
 * Displays files from the ESP32 device
 */

"use client";

import { useEffect, useCallback, useState } from "react";
import { useESP32FileManager } from "../hooks/use-esp32-file-manager";

interface ESP32FileManagerProps {
  serialPort: any;
  isConnected: boolean;
  onError?: (error: string) => void;
}

export function ESP32FileManager({
  serialPort,
  isConnected,
  onError,
}: ESP32FileManagerProps) {
  const { files, isLoading, error, fetchFiles, refreshFiles, downloadFile } =
    useESP32FileManager({ serialPort });
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  // Fetch files when connected
  useEffect(() => {
    if (isConnected && serialPort) {
      fetchFiles("/");
    }
  }, [isConnected, serialPort, fetchFiles]);

  // Report errors
  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  // Handle file download
  const handleDownloadFile = useCallback(
    async (filename: string) => {
      try {
        setDownloadingFile(filename);
        await downloadFile(filename);
        onError?.(null as any); // Clear any previous errors on success
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        onError?.(msg);
      } finally {
        setDownloadingFile(null);
      }
    },
    [downloadFile, onError]
  );

  if (!isConnected) {
    return (
      <div className="esp32-file-manager">
        <div className="file-manager-empty">
          <i className="fas fa-folder-open"></i>
          <p>Connect to ESP32 to view files</p>
        </div>
      </div>
    );
  }

  return (
    <div className="esp32-file-manager">
      <div className="file-manager-header">
        <div className="file-manager-info">
          <i className="fas fa-folder"></i>
          <span className="path">/</span>
        </div>
        <button
          className="btn-refresh"
          onClick={refreshFiles}
          disabled={isLoading}
          title="Refresh file list"
        >
          <i className={`fas fa-sync ${isLoading ? "fa-spin" : ""}`}></i>
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {isLoading && !files.length && (
        <div className="file-list-loading">
          <div className="spinner"></div>
          <span>Loading files...</span>
        </div>
      )}

      {error && (
        <div className="file-list-error">
          <i className="fas fa-exclamation-circle"></i>
          <span>{error}</span>
        </div>
      )}

      {!isLoading && files.length === 0 && !error && (
        <div className="file-list-empty">
          <i className="fas fa-folder-open"></i>
          <p>No files found on ESP32</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="file-list">
          {files.map((file) => (
            <div key={file.name} className="file-item">
              <div className="file-icon">
                <i
                  className={`fas ${
                    file.isDirectory ? "fa-folder" : "fa-file"
                  }`}
                ></i>
              </div>
              <div className="file-info">
                <div className="file-name" title={file.name}>
                  {file.name}
                </div>
                {file.size !== undefined && (
                  <div className="file-size">{formatFileSize(file.size)}</div>
                )}
              </div>
              {!file.isDirectory && (
                <button
                  className="btn-download-file"
                  onClick={() => handleDownloadFile(file.name)}
                  disabled={downloadingFile === file.name}
                  title="Download file"
                >
                  {downloadingFile === file.name ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                    </>
                  ) : (
                    <i className="fas fa-download"></i>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Format file size to human readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
