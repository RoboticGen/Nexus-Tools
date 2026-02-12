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
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <ModalHeader 
          isFlashing={isFlashing} 
          flashProgress={flashProgress} 
          onClose={onClose} 
        />

        {/* Content */}
        <div className="p-6 space-y-6">
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
            />

            {/* Upload Section */}
            {espSupported && (
              <UploadSection
                codePreview={codePreview}
                isFlashing={isFlashing}
                flashProgress={flashProgress}
                isConnected={isConnected}
                hasCode={hasCode}
                onUpload={onUpload}
                onResetConnection={onResetConnection}
              />
            )}
          </div>

          {/* Instructions */}
          <Instructions />
        </div>
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
        <span className="mr-2">🔌</span>
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
    <div className="bg-red-50 border border-red-200 rounded-md p-4">
      <div className="flex items-start">
        <span className="text-red-600 mr-2">⚠️</span>
        <div>
          <p className="font-medium text-red-800">ESP Web Tools Not Available</p>
          <p className="text-red-600 text-sm">Use Chrome 89+ or Edge 89+ with HTTPS or localhost</p>
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
}: {
  isConnected: boolean;
  chipFamily: string;
  connectionError: string | null;
}) {
  return (
    <div className="bg-gray-50 rounded-md p-4">
      <div className={`flex items-center mb-2 ${isConnected ? 'text-green-600' : 'text-gray-500'}`}>
        <span className="mr-2">{isConnected ? '🟢' : '⚫'}</span>
        <span className="font-medium">
          {isConnected ? `Connected to ${chipFamily}` : 'Not connected'}
        </span>
      </div>
      
      {connectionError && (
        <div className="text-red-600 text-sm mt-2 flex items-start">
          <span className="mr-1">❌</span>
          {connectionError}
        </div>
      )}
    </div>
  );
}

function UploadSection({
  codePreview,
  isFlashing,
  flashProgress,
  isConnected,
  hasCode,
  onUpload,
  onResetConnection,
}: {
  codePreview: string;
  isFlashing: boolean;
  flashProgress: number;
  isConnected: boolean;
  hasCode: boolean;
  onUpload: () => void;
  onResetConnection: () => void;
}) {
  return (
    <>
      <div className="space-y-4">
        {/* Code Preview */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">main.py Preview:</h4>
          <div className="bg-gray-900 text-green-400 p-4 rounded-md text-xs font-mono max-h-40 overflow-auto">
            <pre>{codePreview}</pre>
          </div>
        </div>

        {/* Progress Bar */}
        {isFlashing && (
          <div className="space-y-2">
            <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-blue-600 h-2 transition-all duration-300 ease-out rounded-full" 
                style={{ width: `${flashProgress}%` }}
              ></div>
            </div>
            <div className="text-center text-sm text-gray-600">{flashProgress}%</div>
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={onUpload}
          className={`w-full py-3 px-4 rounded-md font-medium transition-all duration-200 ${
            isFlashing || !hasCode
              ? 'bg-gray-400 cursor-not-allowed text-gray-200'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
          disabled={isFlashing || !hasCode}
        >
          {isFlashing ? (
            <span className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Uploading... {flashProgress}%
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <span className="mr-2">📁</span>
              Upload as main.py
            </span>
          )}
        </button>

        {/* Reset Connection Button */}
        {isConnected && (
          <button
            onClick={onResetConnection}
            className="w-full py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={isFlashing}
          >
            Reset Connection
          </button>
        )}
      </div>
    </>
  );
}

function Instructions() {
  return (
    <div className="bg-blue-50 p-4 rounded-md">
      <p className="font-medium text-blue-900 mb-2">Instructions:</p>
      <ol className="text-sm text-blue-800 space-y-1">
        <li>1. Connect your ESP32 to a USB port</li>
        <li>2. Select the correct ESP32 device type above</li>
        <li>3. Click "Upload as main.py" and select the ESP32 port</li>
        <li>4. Wait for the upload process to complete</li>
        <li>5. Your Python code will run automatically on the ESP32!</li>
      </ol>
    </div>
  );
}
