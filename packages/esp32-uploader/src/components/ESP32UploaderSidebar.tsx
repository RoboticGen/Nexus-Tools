/**
 * ESP32 Uploader Sidebar Component
 * Inline version for sidebar use (no modal)
 */

"use client";

import { useESP32Uploader } from "../hooks/use-esp32-uploader";

import type { ESP32Device } from "../types/esp32";

interface ESP32UploaderSidebarProps {
  code: string;
  onStatusUpdate?: (status: string) => void;
  onError?: (error: string) => void;
}

export function ESP32UploaderSidebar({ code, onStatusUpdate, onError }: ESP32UploaderSidebarProps) {
  const {
    // State
    selectedDevice,
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
  } = useESP32Uploader({ code, onStatusUpdate, onError });

  if (!isMounted) {
    return (
      <div className="esp32-sidebar-loading">
        <div className="loading-spinner"></div>
        <span>Loading ESP32 tools...</span>
      </div>
    );
  }

  return (
    <div className="esp32-sidebar">
      {/* Browser Warning */}
      {espSupported === false && (
        <div className="esp32-warning">
          <i className="fas fa-exclamation-triangle"></i>
          <div>
            <p className="warning-title">ESP Web Tools Not Available</p>
            <p className="warning-subtitle">Use Chrome 89+ or Edge 89+ with HTTPS or localhost</p>
          </div>
        </div>
      )}

      {espSupported && (
        <div className="esp32-tools">
          {/* Device Selection */}
          <div className="device-section">
            <h4>Device Selection</h4>
            <select
              className="device-select"
              value={selectedDevice.chipFamily}
              onChange={(e) => {
                const device = devices.find(d => d.chipFamily === e.target.value);
                if (device) setSelectedDevice(device);
              }}
              disabled={isFlashing}
            >
              {devices.map((device) => (
                <option key={device.chipFamily} value={device.chipFamily}>
                  {device.name}
                </option>
              ))}
            </select>
          </div>

          {/* Connection Status */}
          <div className="connection-section">
            <h4>Connection</h4>
            <div className="connection-status">
              <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
                <i className={`fas ${isConnected ? 'fa-link' : 'fa-unlink'}`}></i>
                <span>
                  {isConnected ? `Connected to ${selectedDevice.chipFamily}` : 'Not Connected'}
                </span>
              </div>
              
              {connectionError && (
                <div className="connection-error">
                  <i className="fas fa-exclamation-circle"></i>
                  <span>{connectionError}</span>
                </div>
              )}

              <div className="connection-actions">
                {!isConnected ? (
                  <button
                    className="btn-connect"
                    onClick={connectToDevice}
                    disabled={isFlashing}
                  >
                    <i className="fas fa-plug"></i>
                    Connect Device
                  </button>
                ) : (
                  <button
                    className="btn-disconnect"
                    onClick={resetConnection}
                    disabled={isFlashing}
                  >
                    <i className="fas fa-unlink"></i>
                    Disconnect
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Upload Section */}
          <div className="upload-section">
            <h4>Code Upload</h4>
            
            {/* Progress */}
            {isFlashing && (
              <div className="upload-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${flashProgress}%` }}
                  ></div>
                </div>
                <div className="progress-text">Uploading... {flashProgress}%</div>
              </div>
            )}

            <button
              className={`btn-upload ${isFlashing ? 'uploading' : ''}`}
              onClick={uploadCode}
              disabled={!code.trim() || isFlashing || !isConnected}
            >
              {isFlashing ? (
                <>
                  <div className="spinner"></div>
                  Uploading... {flashProgress}%
                </>
              ) : (
                <>
                  <i className="fas fa-upload"></i>
                  Upload Code
                </>
              )}
            </button>
            
            {!code.trim() && (
              <p className="upload-hint">
                <i className="fas fa-info-circle"></i>
                Write some code to enable upload
              </p>
            )}
          </div>

          {/* Instructions */}
          <div className="instructions-section">
            <h4>Instructions</h4>
            <ol className="instructions-list">
              <li>Select your ESP32 device type from the dropdown</li>
              <li>Click "Connect Device" to establish connection</li>
              <li>Write or paste your Python code in the editor</li>
              <li>Click "Upload Code" </li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}