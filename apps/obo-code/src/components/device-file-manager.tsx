"use client";

import { useESP32FileManager, type SerialPort } from "@nexus-tools/esp32-uploader";
import { forwardRef, useEffect, useImperativeHandle } from "react";

import { DeviceSidebar } from "@/components/ui/device-sidebar";

interface DeviceFileManagerProps {
  serialPort: SerialPort | null;
  isConnected: boolean;
  /** Filename currently open in editor - shown highlighted in the list */
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

/**
 * Adapter between the app-agnostic `useESP32FileManager` hook (from
 * `@nexus-tools/esp32-uploader`) and the design system's `DeviceSidebar`.
 *
 * `DeviceSidebar` is Tailwind-v4/roboticgen-theme only and its generated
 * files use the `@/` alias, which resolves against whichever app compiles
 * it - so it lives here, app-local, rather than inside the shared
 * `esp32-uploader` package (which has no Tailwind build of its own and
 * would need every consuming app to happen to have identically-pathed
 * `@/components/ui/*` files for its imports to resolve). Same reasoning as
 * `ReplTab`/`FlasherTab` in `esp32-output-panel.tsx`.
 *
 * `DeviceSidebar` has no concept of directories - only files render.
 */
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
