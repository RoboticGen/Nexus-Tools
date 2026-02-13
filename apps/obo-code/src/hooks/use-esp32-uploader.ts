/**
 * ESP32 Uploader Hook
 * Main hook for uploading code to ESP32 devices
 */

import { useState, useCallback, useEffect, useRef } from "react";

import { ESP32_DEVICES } from "@/constants/esp32";
import { convertToMicroPython, createMainPyFile } from "@/utils/micropython-converter";

import { useESP32Serial } from "./use-esp32-serial";

import type { ESP32Device } from "@/types/esp32";

interface UseESP32UploaderOptions {
  code: string;
  onStatusUpdate?: (status: string) => void;
  onError?: (error: string) => void;
}

export function useESP32Uploader({ code, onStatusUpdate, onError }: UseESP32UploaderOptions) {
  const [selectedDevice, setSelectedDevice] = useState<ESP32Device>(ESP32_DEVICES[0]);
  const [showUploader, setShowUploader] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashProgress, setFlashProgress] = useState(0);
  const [espSupported, setEspSupported] = useState<boolean | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const connectedPortRef = useRef<any>(null);
  const espToolRef = useRef<any>(null);

  const {
    checkSerialSupport,
    connectToESP32,
    writeFileToESP32,
    stopRunningCode,
    softResetESP32,
    closePort,
  } = useESP32Serial({ baudRate: selectedDevice.baudRate });

  /**
   * Initialize ESP Web Tools (dynamic import for SSR)
   */
  const initializeEspWebTools = useCallback(async () => {
    try {
      await import('esp-web-tools');
      
      if (espToolRef.current) {
        espToolRef.current = null;
      }
      
      setEspSupported(true);
    } catch (error) {
      console.error('Failed to load ESP Web Tools:', error);
      setEspSupported(false);
      onError?.('Failed to load ESP Web Tools');
    }
  }, [onError]);

  /**
   * Upload code to ESP32 as main.py
   */
  const uploadCode = useCallback(async () => {
    if (!espSupported) {
      onError?.("Web Serial API not supported. Use Chrome/Edge with HTTPS or localhost.");
      return;
    }

    if (!code.trim()) {
      onError?.("No code to upload");
      return;
    }

    let port: any = null;

    try {
      setIsFlashing(true);
      setFlashProgress(0);
      setConnectionError(null);
      
      // Step 1: Prepare code
      onStatusUpdate?.("Preparing MicroPython code...");
      const micropythonCode = convertToMicroPython(code);
      setFlashProgress(20);

      // Step 2: Create main.py content
      onStatusUpdate?.("Creating main.py file content...");
      const mainPyContent = createMainPyFile(micropythonCode);
      setFlashProgress(30);

      // Step 3: Use existing connection or create new one
      if (connectedPortRef.current && connectedPortRef.current.readable) {
        onStatusUpdate?.("Using existing connection...");
        port = connectedPortRef.current;
        setFlashProgress(50);
      } else {
        onStatusUpdate?.("Connecting to ESP32...");
        port = await connectToESP32();
        connectedPortRef.current = port;
        setIsConnected(true);
        setFlashProgress(50);
      }

      // Step 4: Stop any running code
      onStatusUpdate?.("Stopping any running code...");
      await stopRunningCode(port);
      setFlashProgress(60);

      // Step 5: Write main.py to ESP32
      onStatusUpdate?.("Writing main.py to ESP32...");
      await writeFileToESP32(port, 'main.py', mainPyContent);
      setFlashProgress(90);

      // Step 6: Soft reset to run the code
      onStatusUpdate?.("Restarting ESP32...");
      await softResetESP32(port);
      setFlashProgress(100);

      setIsConnected(true);
      onStatusUpdate?.("Code uploaded successfully as main.py! Your ESP32 is now running your code.");

      setTimeout(() => {
        setIsFlashing(false);
        setFlashProgress(0);
      }, 2000);

    } catch (error: any) {
      setIsFlashing(false);
      setFlashProgress(0);
      setIsConnected(false);
      
      // Handle user cancellation gracefully
      if (error.message && error.message.includes('Connection cancelled')) {
        setConnectionError(null); // Don't show error for user cancellation
        onStatusUpdate?.("Upload cancelled by user");
        return;
      }
      
      // Clear the stored connection on upload error
      if (connectedPortRef.current) {
        await closePort(connectedPortRef.current);
        connectedPortRef.current = null;
        setIsConnected(false);
      }
      
      const errorMsg = error.message || 'Unknown upload error';
      setConnectionError(errorMsg);
      onError?.(errorMsg);
    } finally {
      // Don't close the port after upload - keep it for future uploads
      // Only close if there was an error and no existing connection
      if (!connectedPortRef.current && port) {
        await closePort(port);
      }
    }
  }, [espSupported, code, connectToESP32, stopRunningCode, writeFileToESP32, softResetESP32, closePort, onStatusUpdate, onError]);

  /**
   * Connect to ESP32 (without uploading)
   */
  const connectToDevice = useCallback(async () => {
    if (!espSupported) {
      setConnectionError("ESP Web Tools not supported");
      return;
    }

    try {
      setConnectionError(null);
      onStatusUpdate?.("Connecting to ESP32...");
      
      // Connect and keep the port open for future uploads
      const port = await connectToESP32();
      connectedPortRef.current = port;
      setIsConnected(true);
      onStatusUpdate?.("Connected to ESP32 - ready for upload!");
      
    } catch (error: any) {
      setIsConnected(false);
      connectedPortRef.current = null;
      
      // Handle user cancellation gracefully
      if (error.message && error.message.includes('Connection cancelled')) {
        setConnectionError(null); // Don't show error for user cancellation
        onStatusUpdate?.("Connection cancelled by user");
        return;
      }
      
      const errorMsg = error.message || 'Unknown connection error';
      setConnectionError(errorMsg);
      onError?.(errorMsg);
    }
  }, [espSupported, connectToESP32, onStatusUpdate, onError]);

  /**
   * Reset connection state
   */
  const resetConnection = useCallback(async () => {
    // Close existing connection if any
    if (connectedPortRef.current) {
      await closePort(connectedPortRef.current);
      connectedPortRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionError(null);
    setFlashProgress(0);
    espToolRef.current = null;
    onStatusUpdate?.("Connection cleared");
  }, [onStatusUpdate, closePort]);

  /**
   * Open uploader modal
   */
  const openUploader = useCallback(() => {
    setShowUploader(true);
  }, []);

  /**
   * Close uploader modal
   */
  const closeUploader = useCallback(() => {
    if (isFlashing) {
      onStatusUpdate?.("Please wait for flashing to complete before closing");
      return;
    }
    
    setShowUploader(false);
    setConnectionError(null);
    setFlashProgress(0);
  }, [isFlashing, onStatusUpdate]);

  /**
   * Get preview of main.py content
   */
  const getMainPyPreview = useCallback((maxLength: number = 500): string => {
    const micropythonCode = convertToMicroPython(code);
    const mainPyContent = createMainPyFile(micropythonCode);
    return mainPyContent.slice(0, maxLength) + (mainPyContent.length > maxLength ? '...' : '');
  }, [code]);

  // Initialize on mount
  useEffect(() => {
    setIsMounted(true);
    const isSupported = checkSerialSupport();
    setEspSupported(isSupported);
    
    if (isSupported) {
      initializeEspWebTools();
    }
  }, [checkSerialSupport, initializeEspWebTools]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connectedPortRef.current) {
        closePort(connectedPortRef.current).catch(console.warn);
      }
    };
  }, [closePort]);

  return {
    // State
    selectedDevice,
    showUploader,
    isMounted,
    isConnected,
    isFlashing,
    flashProgress,
    espSupported,
    connectionError,
    devices: ESP32_DEVICES,
    
    // Actions
    setSelectedDevice,
    uploadCode,
    connectToDevice,
    resetConnection,
    openUploader,
    closeUploader,
    getMainPyPreview,
  };
}
