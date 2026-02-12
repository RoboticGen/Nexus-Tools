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
        <button 
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded opacity-50 cursor-not-allowed" 
          disabled
        >
          <span className="mr-2">🔌</span>
          Loading...
        </button>
      </div>
    );
  }

  return (
    <div className="esp32-upload-trigger">
      <button
        onClick={onClick}
        className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-all duration-200 ${
          disabled || isSupported === false ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        disabled={disabled || isSupported === false}
        title={
          isSupported === false 
            ? "ESP Web Tools not supported - use Chrome/Edge with HTTPS" 
            : "Open ESP32 uploader"
        }
      >
        <span className="mr-2">🔌</span>
        Upload to ESP32
      </button>
    </div>
  );
}
