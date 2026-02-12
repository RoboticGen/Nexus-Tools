/**
 * ESP32 Uploader Button Component
 * Trigger button to open the ESP32 uploader modal
 */

"use client";

interface ESP32UploaderButtonProps {
  onClick: () => void;
  disabled: boolean;
  isSupported: boolean | null;
  isMounted: boolean;
}

export function ESP32UploaderButton({ 
  onClick, 
  disabled, 
  isSupported,
  isMounted 
}: ESP32UploaderButtonProps) {
  if (!isMounted) {
    return (
      <div className="esp32-upload-trigger">
        <button disabled>
          Loading...
        </button>
      </div>
    );
  }

  return (
    <div className="esp32-upload-trigger">
      <button
        onClick={onClick}
        disabled={disabled || isSupported === false}
        title={
          isSupported === false 
            ? "ESP Web Tools not supported - use Chrome/Edge with HTTPS" 
            : "Open ESP32 uploader"
        }
      >
        Upload to ESP32
      </button>
    </div>
  );
}
