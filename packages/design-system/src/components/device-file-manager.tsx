"use client";

import { useESP32FileManager, type SerialPort } from "@nexus-tools/esp32-uploader";
import { forwardRef, useEffect, useImperativeHandle } from "react";

import { DeviceSidebar } from "@nexus-tools/design-system/components/ui/device-sidebar";

interface DeviceFileManagerProps {
  serialPort: SerialPort | null;
  isConnected: boolean;
  /** Highlighted in the list. */
  activeFileName?: string | null;
  onError?: (error: string) => void;
  onOpenFileInEditor?: (filename: string, content: string) => void;
  onExpandChange?: (expanded: boolean) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export interface DeviceFileManagerHandle {
  refreshFiles: () => void;
}

// Joins the headless `useESP32FileManager` hook to `DeviceSidebar`; it stays out of the esp32-uploader package, which has no design-system dependency.
/** `DeviceSidebar` has no concept of directories — only files render. */
export const DeviceFileManager = forwardRef<DeviceFileManagerHandle, DeviceFileManagerProps>(
  function DeviceFileManager(
    { serialPort, isConnected, activeFileName = null, onError, onOpenFileInEditor, onExpandChange, onConnect, onDisconnect },
    ref
  ) {
    const { files, isLoading, error, fetchFiles, refreshFiles, downloadFile, viewFile, deleteFile } =
      useESP32FileManager({ serialPort });

    useImperativeHandle(ref, () => ({ refreshFiles }), [refreshFiles]);

    useEffect(() => {
      if (isConnected && serialPort) fetchFiles("/");
    }, [isConnected, serialPort, fetchFiles]);

    useEffect(() => {
      if (error) onError?.(error);
    }, [error, onError]);

    const handleFileSelect = async (filename: string) => {
      try {
        const content = await viewFile(filename);
        onOpenFileInEditor?.(filename, content);
      } catch (err) {
        onError?.(err instanceof Error ? err.message : String(err));
      }
    };

    const handleFileDownload = async (filename: string) => {
      try {
        await downloadFile(filename);
      } catch (err) {
        onError?.(err instanceof Error ? err.message : String(err));
      }
    };

    const handleFileDelete = async (filename: string) => {
      try {
        await deleteFile(filename);
      } catch (err) {
        onError?.(err instanceof Error ? err.message : String(err));
      }
    };

    return (
      <DeviceSidebar
        connectionState={isConnected ? "connected" : "disconnected"}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        onExpandChange={onExpandChange}
        busy={isLoading}
        onRefresh={() => refreshFiles()}
        files={files
          .filter((file) => !file.isDirectory)
          .map((file) => ({
            name: file.name,
            size: file.size,
            active: !!activeFileName && file.name.replace(/^\/+/, "") === activeFileName.replace(/^\/+/, ""),
          }))}
        onFileSelect={handleFileSelect}
        onFileDownload={handleFileDownload}
        onFileDelete={handleFileDelete}
      />
    );
  }
);
