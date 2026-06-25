/**
 * ESP32 Uploader Component
 * Sidebar version for ESP32 code uploading
 */

"use client";

import { ESP32UploaderSidebar } from "./ESP32UploaderSidebar";

interface ESP32UploaderProps {
  code: string;
  onStatusUpdate?: (status: string) => void;
  onError?: (error: string) => void;
}

export function ESP32Uploader({ code, onStatusUpdate, onError }: ESP32UploaderProps) {
  return (
    <ESP32UploaderSidebar
      code={code}
      onStatusUpdate={onStatusUpdate}
      onError={onError}
    />
  );
}

// Re-export for convenience
export { ESP32UploaderSidebar } from "./ESP32UploaderSidebar";
export type { ESP32UploaderProps };
