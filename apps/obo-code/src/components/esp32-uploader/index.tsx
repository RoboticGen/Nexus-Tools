/**
 * ESP32 Uploader Component
 * Main component that combines the button and modal
 */

"use client";

import { useESP32Uploader } from "@/hooks/use-esp32-uploader";

import { ESP32UploaderButton } from "./ESP32UploaderButton";
import { ESP32UploaderModal } from "./ESP32UploaderModal";

interface ESP32UploaderProps {
  code: string;
  onStatusUpdate?: (status: string) => void;
  onError?: (error: string) => void;
}

export function ESP32Uploader({ code, onStatusUpdate, onError }: ESP32UploaderProps) {
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
    resetConnection,
    openUploader,
    closeUploader,
    getMainPyPreview,
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
        codePreview={getMainPyPreview(500)}
        onUpload={uploadCode}
        onResetConnection={resetConnection}
        hasCode={!!code.trim()}
      />
    </>
  );
}

// Re-export types for convenience
export type { ESP32UploaderProps };
