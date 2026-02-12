/**
 * ESP32 Uploader Modal Component
 * Modal dialog for uploading code to ESP32
 */

"use client";

import { useEffect, useCallback } from "react";

import type { ESP32Device } from "@/types/esp32";

interface ESP32UploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDevice: ESP32Device;
  onDeviceChange: (device: ESP32Device) => void;
  devices: ESP32Device[];
  isFlashing: boolean;
  flashProgress: number;
  isConnected: boolean;
  connectionError: string | null;
  espSupported: boolean | null;
  codePreview: string;
  onUpload: () => void;
  onConnect: () => void;
  onResetConnection: () => void;
  hasCode: boolean;
}

export function ESP32UploaderModal({
  isOpen,
  onClose,
  selectedDevice,
  onDeviceChange,
  devices,
  isFlashing,
  flashProgress,
  isConnected,
  connectionError,
  espSupported,
  codePreview,
  onUpload,
  onConnect,
  onResetConnection,
  hasCode,
}: ESP32UploaderModalProps) {
  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => document.removeEventListener('keydown', handleEscapeKey);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="esp32-modal-overlay" 
      onClick={handleBackdropClick}
    >
      <div 
        className="esp32-modal" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <ModalHeader 
          isFlashing={isFlashing} 
          flashProgress={flashProgress} 
          onClose={onClose} 
        />

        {/* Scrollable Content */}
        <div className="esp32-modal-content">
          {/* Browser Warning */}
          {espSupported === false && <BrowserWarning />}

          <div className="space-y-4">
            {/* Device Selection */}
            <DeviceSelector
              selectedDevice={selectedDevice}
              onDeviceChange={onDeviceChange}
              devices={devices}
              disabled={isFlashing}
            />

            {/* Connection Status */}
            <ConnectionStatus
              isConnected={isConnected}
              chipFamily={selectedDevice.chipFamily}
              connectionError={connectionError}
              onConnect={onConnect}
              onDisconnect={onResetConnection}
              isFlashing={isFlashing}
            />

            {/* Code Preview Section */}
            {espSupported && (
              <CodePreviewSection
                codePreview={codePreview}
                isFlashing={isFlashing}
                flashProgress={flashProgress}
              />
            )}
          </div>

          {/* Instructions */}
          <div className="mt-6">
            <Instructions />
          </div>
        </div>

        {/* Sticky Upload Section */}
        {espSupported && (
          <UploadButtonSection
            isFlashing={isFlashing}
            flashProgress={flashProgress}
            hasCode={hasCode}
            onUpload={onUpload}
          />
        )}
      </div>
    </div>
  );
}

// Sub-components

function ModalHeader({ 
  isFlashing, 
  flashProgress, 
  onClose 
}: { 
  isFlashing: boolean; 
  flashProgress: number; 
  onClose: () => void;
}) {
  return (
    <div className="flex justify-between items-center p-6 border-b border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
        ESP32 Code Uploader
      </h3>
      <div className="flex items-center space-x-4">
        {isFlashing && (
          <span className="text-blue-600 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Flashing {flashProgress}%
          </span>
        )}
        <button
          onClick={onClose}
          className={`text-gray-400 hover:text-gray-600 transition-colors ${
            isFlashing ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={isFlashing}
          title={isFlashing ? "Cannot close while flashing" : "Close uploader (Esc)"}
        >
          <span className="text-xl">×</span>
        </button>
      </div>
    </div>
  );
}

function BrowserWarning() {
  return (
    <div className="esp32-warning">
      <div className="flex items-start">
        <div>
          <p className="font-medium text-amber-800">ESP Web Tools Not Available</p>
          <p className="text-amber-600 text-sm">Use Chrome 89+ or Edge 89+ with HTTPS or localhost</p>
        </div>
      </div>
    </div>
  );
}

function DeviceSelector({
  selectedDevice,
  onDeviceChange,
  devices,
  disabled,
}: {
  selectedDevice: ESP32Device;
  onDeviceChange: (device: ESP32Device) => void;
  devices: ESP32Device[];
  disabled: boolean;
}) {
  return (
    <div>
      <label htmlFor="device-select" className="block text-sm font-medium text-gray-700 mb-2">
        ESP32 Device Type:
      </label>
      <select
        id="device-select"
        value={selectedDevice.name}
        onChange={(e) => {
          const device = devices.find(d => d.name === e.target.value);
          if (device) onDeviceChange(device);
        }}
        disabled={disabled}
        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {devices.map((device) => (
          <option key={device.name} value={device.name}>
            {device.name} ({device.chipFamily})
          </option>
        ))}
      </select>
    </div>
  );
}

function ConnectionStatus({
  isConnected,
  chipFamily,
  connectionError,
  onConnect,
  onDisconnect,
  isFlashing,
}: {
  isConnected: boolean;
  chipFamily: string;
  connectionError: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  isFlashing: boolean;
}) {
  return (
    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className={isConnected ? 'esp32-status-connected' : 'esp32-status-disconnected'}>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-white animate-pulse' : 'bg-gray-400'}`}></div>
          {isConnected ? `Connected to ${chipFamily}` : 'Not connected'}
        </div>
        
        {/* Connect/Disconnect Button */}
        <button
          onClick={isConnected ? onDisconnect : onConnect}
          className="esp32-connect-btn"
          disabled={isFlashing}
        >
          {isConnected ? 'Disconnect' : 'Connect'}
        </button>
      </div>
      
      {connectionError && (
        <div className="text-red-600 text-sm mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full flex-shrink-0 mt-0.5"></div>
            {connectionError}
          </div>
        </div>
      )}
    </div>
  );
}

function CodePreviewSection({
  codePreview,
  isFlashing,
  flashProgress,
}: {
  codePreview: string;
  isFlashing: boolean;
  flashProgress: number;
}) {
  return (
    <div className="space-y-4">
      {/* Code Preview */}
      <div>
        <h4 className="font-medium text-gray-900 mb-2">Code Preview:</h4>
        <div className="esp32-code-preview">
          <pre>{codePreview}</pre>
        </div>
      </div>

      {/* Progress Bar */}
      {isFlashing && (
        <div className="space-y-2">
          <div className="esp32-progress-bar">
            <div 
              className="esp32-progress-fill" 
              style={{ width: `${flashProgress}%` }}
            ></div>
          </div>
          <div className="text-center text-sm text-gray-600">{flashProgress}%</div>
        </div>
      )}
    </div>
  );
}

function UploadButtonSection({
  isFlashing,
  flashProgress,
  hasCode,
  onUpload,
}: {
  isFlashing: boolean;
  flashProgress: number;
  hasCode: boolean;
  onUpload: () => void;
}) {
  return (
    <div className="esp32-upload-footer">
      <button
        onClick={onUpload}
        className="esp32-upload-btn"
        disabled={isFlashing || !hasCode}
      >
        {isFlashing ? (
          <span className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Uploading... {flashProgress}%
          </span>
        ) : (
          <span className="flex items-center justify-center">
            Upload
          </span>
        )}
      </button>
    </div>
  );
}

function Instructions() {
  return (
    <div className="esp32-instructions">
      <p className="font-medium text-blue-900 mb-2">Instructions:</p>
      <ol className="text-sm text-blue-800">
        <li>Connect your ESP32 to a USB port</li>
        <li>Select the correct ESP32 device type above</li>
        <li>Click "Upload" and select the ESP32 port</li>
        <li>Wait for the upload process to complete</li>
        <li>Your Python code will run automatically on the ESP32!</li>
      </ol>
    </div>
  );
}
