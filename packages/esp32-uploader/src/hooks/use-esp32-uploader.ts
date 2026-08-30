/** ESP32 Uploader Hook Main hook for uploading code to ESP32 devices */

import { useState, useCallback, useEffect, useRef, useSyncExternalStore } from "react";

import { useESP32Serial } from "./use-esp32-serial";
import { ESP32_DEVICES } from "../constants/esp32";
import { translateErrorMessage } from "../utils/error-messages";
import { convertToMicroPython, createMainPyFile } from "../utils/micropython-converter";


import type { ESP32Device } from "../types/esp32";

/** Web Serial support and mount state never change after load, so there is nothing to subscribe to. */
const subscribeNever = () => () => {};

interface UseESP32UploaderOptions {
  code: string;
  onStatusUpdate?: (status: string) => void;
  onError?: (error: string) => void;
  onConnectionEstablished?: (port: any) => void; // New callback for when connection is ready
}

export function useESP32Uploader({ code, onStatusUpdate, onError, onConnectionEstablished }: UseESP32UploaderOptions) {
  const [selectedDevice, setSelectedDevice] = useState<ESP32Device>(ESP32_DEVICES[0]);
  const [showUploader, setShowUploader] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [serialPort, setSerialPort] = useState<any>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashProgress, setFlashProgress] = useState(0);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const connectedPortRef = useRef<any>(null);

  const {
    checkSerialSupport,
    connectToESP32,
    writeFileToESP32,
    stopRunningCode,
    softResetESP32,
    closePort,
  } = useESP32Serial({ baudRate: selectedDevice.baudRate });

  // Both read state the server cannot see, so they use a server snapshot rather than a setState-on-mount effect, which renders once with the wrong value.
  const isMounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  const espSupported = useSyncExternalStore(
    subscribeNever,
    checkSerialSupport,
    () => null as boolean | null
  );

  /** Upload code to ESP32 as main.py */
  const uploadCode = useCallback(async () => {
    if (!espSupported) {
      onError?.(translateErrorMessage("Web Serial API not supported. Use Chrome/Edge with HTTPS or localhost."));
      return;
    }

    if (!code.trim()) {
      onError?.(translateErrorMessage("No code to upload"));
      return;
    }

    let port: any = null;

    try {
      setIsFlashing(true);
      setFlashProgress(0);
      setConnectionError(null);
      
      onStatusUpdate?.("Preparing MicroPython code...");
      const micropythonCode = convertToMicroPython(code);
      setFlashProgress(20);

      onStatusUpdate?.("Creating main.py file content...");
      const mainPyContent = createMainPyFile(micropythonCode);
      setFlashProgress(30);

      if (connectedPortRef.current && connectedPortRef.current.readable) {
        onStatusUpdate?.("Using existing connection...");
        port = connectedPortRef.current;
        setSerialPort(port);
        setFlashProgress(50);
      } else {
        onStatusUpdate?.("Connecting to ESP32...");
        port = await connectToESP32();
        connectedPortRef.current = port;
        setSerialPort(port);
        setIsConnected(true);
        setFlashProgress(50);
      }

      onStatusUpdate?.("Stopping any running code...");
      await stopRunningCode(port);
      setFlashProgress(60);

      onStatusUpdate?.("Writing main.py to ESP32...");
      await writeFileToESP32(port, 'main.py', mainPyContent);
      setFlashProgress(90);

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
      
      const errorMsg = error.message || 'Unknown upload error';
      const isWritableStreamLocked = errorMsg.includes("WritableStream is locked") || errorMsg.includes("Cannot create writer");
      
      // Handle user cancellation gracefully
      if (error.message && error.message.includes('Connection cancelled')) {
        setConnectionError(null); // Don't show error for user cancellation
        onStatusUpdate?.("Upload cancelled by user");
        return;
      }
      
      // If it's a WritableStream locked error, keep the connection alive User can manually disconnect REPL and retry
      if (isWritableStreamLocked) {
        const userFriendlyMsg = translateErrorMessage(error);
        setConnectionError(userFriendlyMsg);
        onError?.(userFriendlyMsg);
        return; // Don't disconnect, let user fix it
      }
      
      // For other errors, clear the connection
      setIsConnected(false);
      
      // Clear the stored connection on upload error
      if (connectedPortRef.current) {
        await closePort(connectedPortRef.current);
        connectedPortRef.current = null;
        setSerialPort(null);
        setIsConnected(false);
      }
      
      const userFriendlyMsg = translateErrorMessage(error);
      setConnectionError(userFriendlyMsg);
      onError?.(userFriendlyMsg);
    } finally {
      // Don't close the port after upload - keep it for future uploads Only close if there was an error and no existing connection
      if (!connectedPortRef.current && port) {
        await closePort(port);
      }
    }
  }, [espSupported, code, connectToESP32, stopRunningCode, writeFileToESP32, softResetESP32, closePort, onStatusUpdate, onError]);

  /** Connect to ESP32 (without uploading) */
  const connectToDevice = useCallback(async () => {
    console.log("[ESP32Uploader.connectToDevice] Starting connection...");
    
    if (!espSupported) {
      console.error("[ESP32Uploader.connectToDevice] Web Serial API not supported!");
      setConnectionError("ESP Web Tools not supported");
      return;
    }

    try {
      setConnectionError(null);
      onStatusUpdate?.("Connecting to ESP32...");
      console.log("[ESP32Uploader.connectToDevice] Calling connectToESP32...");
      
      // Connect and keep the port open for future uploads
      const port = await connectToESP32();
      console.log("[ESP32Uploader.connectToDevice] Port opened successfully:", port);
      connectedPortRef.current = port;
      setSerialPort(port);
      setIsConnected(true);
      onStatusUpdate?.("Connected to ESP32 - ready for upload!");
      
      // Trigger auto-detection of files and REPL initialization
      onConnectionEstablished?.(port);
      
    } catch (error: any) {
      console.error("[ESP32Uploader.connectToDevice] Connection error:", error);
      setIsConnected(false);
      connectedPortRef.current = null;
      setSerialPort(null);
      
      // Handle user cancellation gracefully
      if (error.message && error.message.includes('Connection cancelled')) {
        setConnectionError(null); // Don't show error for user cancellation
        onStatusUpdate?.("Connection cancelled by user");
        return;
      }
      
      const userFriendlyMsg = translateErrorMessage(error);
      setConnectionError(userFriendlyMsg);
      onError?.(userFriendlyMsg);
    }
  }, [espSupported, connectToESP32, onStatusUpdate, onError, onConnectionEstablished]);

  /** Reset connection state */
  const resetConnection = useCallback(async () => {
    // Close existing connection if any
    if (connectedPortRef.current) {
      await closePort(connectedPortRef.current);
      connectedPortRef.current = null;
    }
    
    setIsConnected(false);
    setSerialPort(null);
    setConnectionError(null);
    setFlashProgress(0);
    onStatusUpdate?.("Connection cleared");
  }, [onStatusUpdate, closePort]);

  /** Open uploader modal */
  const openUploader = useCallback(() => {
    setShowUploader(true);
  }, []);

  /** Close uploader modal */
  const closeUploader = useCallback(() => {
    if (isFlashing) {
      onStatusUpdate?.("Please wait for flashing to complete before closing");
      return;
    }
    
    setShowUploader(false);
    setConnectionError(null);
    setFlashProgress(0);
  }, [isFlashing, onStatusUpdate]);

  /** Get preview of main.py content */
  const getMainPyPreview = useCallback((maxLength: number = 500): string => {
    const micropythonCode = convertToMicroPython(code);
    const mainPyContent = createMainPyFile(micropythonCode);
    return mainPyContent.slice(0, maxLength) + (mainPyContent.length > maxLength ? '...' : '');
  }, [code]);

  /** Save a file directly to ESP32 */
  const saveFileToDevice = useCallback(async (filename: string, content: string) => {
    if (!isConnected || !connectedPortRef.current) {
      onError?.('Device not connected. Please connect first.');
      return;
    }

    if (!content.trim()) {
      onError?.('No content to save');
      return;
    }

    try {
      onStatusUpdate?.(`Saving ${filename} to device...`);
      await writeFileToESP32(connectedPortRef.current, filename, content);
      onStatusUpdate?.(`Successfully saved ${filename} to device`);
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to save file';
      onError?.(errorMsg);
      throw error;
    }
  }, [isConnected, writeFileToESP32, onStatusUpdate, onError]);


  useEffect(() => {
    return () => {
      if (connectedPortRef.current) {
        closePort(connectedPortRef.current).catch(console.warn);
      }
    };
  }, [closePort]);

  return {
    selectedDevice,
    showUploader,
    isMounted,
    isConnected,
    serialPort,
    isFlashing,
    flashProgress,
    espSupported,
    connectionError,
    devices: ESP32_DEVICES,
    
    setSelectedDevice,
    uploadCode,
    connectToDevice,
    resetConnection,
    openUploader,
    closeUploader,
    getMainPyPreview,
    saveFileToDevice,
  };
}
