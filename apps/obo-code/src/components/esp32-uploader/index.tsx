/**
 * ESP32 Uploader Component
 * Main component that can render as modal or sidebar
 */

"use client";

import { useESP32Uploader } from "@/hooks/use-esp32-uploader";

import { ESP32UploaderButton } from "./ESP32UploaderButton";
import { ESP32UploaderModal } from "./ESP32UploaderModal";
import { ESP32UploaderSidebar } from "./ESP32UploaderSidebar";

interface ESP32UploaderProps {
  code: string;
  onStatusUpdate?: (status: string) => void;
  onError?: (error: string) => void;
  mode?: 'modal' | 'sidebar';
}

export function ESP32Uploader({ code, onStatusUpdate, onError, mode = 'modal' }: ESP32UploaderProps) {
  // For sidebar mode, render the sidebar component directly
  if (mode === 'sidebar') {
    return (
      <ESP32UploaderSidebar
        code={code}
        onStatusUpdate={onStatusUpdate}
        onError={onError}
      />
    );
  }

  // For modal mode, use the original modal logic
  const {
    // State
    selectedDevice,
    showUploader,
    isMounted,
    isConnected,
    isFlashing,
    flashProgress,
    espSupported,
    connectionError,
    devices,
    
    // Actions
    setSelectedDevice,
    uploadCode,
    connectToDevice,
    resetConnection,
    openUploader,
    closeUploader,
  } = useESP32Uploader({ code, onStatusUpdate, onError });

  return (
    <>
      <ESP32UploaderButton
        onClick={openUploader}
        disabled={!code.trim()}
        isSupported={espSupported}
        isMounted={isMounted}
      />
      
      <ESP32UploaderModal
        isOpen={showUploader}
        onClose={closeUploader}
        selectedDevice={selectedDevice}
        onDeviceChange={setSelectedDevice}
        devices={devices}
        isFlashing={isFlashing}
        flashProgress={flashProgress}
        isConnected={isConnected}
        connectionError={connectionError}
        espSupported={espSupported}
        onUpload={uploadCode}
        onConnect={connectToDevice}
        onResetConnection={resetConnection}
        hasCode={!!code.trim()}
      />
    </>
  );
}

export { ESP32UploaderSidebar } from "./ESP32UploaderSidebar";
