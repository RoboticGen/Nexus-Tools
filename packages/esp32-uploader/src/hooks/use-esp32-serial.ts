/**
 * ESP32 Serial Communication Hook
 * Handles Web Serial API connection, file writing, and device control.
 *
 * All read/write operations are routed through the shared
 * SerialStreamManager to prevent "stream is locked" errors.
 */

import { useCallback } from "react";

import { ESP32_USB_FILTERS, DEFAULT_SERIAL_OPTIONS } from "../constants/esp32";
import { serialStreamManager } from "../utils/serial-stream-manager";

interface UseESP32SerialOptions {
  baudRate: number;
}

// Type alias for Serial Port (Web Serial API isn't in standard TS lib)
type SerialPortType = any;

export function useESP32Serial({ baudRate }: UseESP32SerialOptions) {
  /**
   * Check if Web Serial API is supported in this browser
   *
   * Note: window.isSecureContext already returns true for localhost,
   * 127.0.0.1, and HTTPS in all modern browsers. No need for extra checks.
   */
  const checkSerialSupport = useCallback((): boolean => {
    if (typeof window === "undefined") return false;

    const hasSerial = "serial" in navigator;
    const isSecureContext = window.isSecureContext;

    return hasSerial && isSecureContext;
  }, []);

  /**
   * Connect to ESP32 via Web Serial API and initialize the shared
   * stream manager. Returns the raw serial port object.
   */
  const connectToESP32 = useCallback(async (): Promise<SerialPortType> => {
    try {
      const port = await (navigator as any).serial.requestPort({
        filters: ESP32_USB_FILTERS,
      });

      await port.open({
        baudRate,
        ...DEFAULT_SERIAL_OPTIONS,
      });

      // Hand the port to the stream manager immediately.
      // From this point on, ALL reads/writes go through the manager.
      await serialStreamManager.initialize(port);

      return port;
    } catch (error: any) {
      if (error.name === "NotFoundError") {
        if (error.message?.includes("No port selected")) {
          throw new Error("Connection cancelled - no device was selected");
        }
        throw new Error("ESP32 device not found. Please check your USB connection and try again.");
      } else if (error.name === "NetworkError") {
        throw new Error("Failed to open connection to ESP32. Device may be in use by another application.");
      } else if (error.name === "InvalidStateError") {
        throw new Error("ESP32 device is already connected or in an invalid state.");
      } else if (error.name === "NotSupportedError") {
        throw new Error("Your browser does not support connecting to this type of device.");
      } else if (error.name === "SecurityError") {
        throw new Error("Connection blocked for security reasons. Make sure you're using HTTPS or localhost.");
      }
      throw new Error(`Connection failed: ${error.message || "Unknown error occurred"}`);
    }
  }, [baudRate]);

  /**
   * Write a file to ESP32 using Raw REPL mode (via stream manager).
   * This is safe to call even when REPL is active — the operation queue
   * ensures exclusive access.
   */
  const writeFileToESP32 = useCallback(
    async (_port: SerialPortType, filename: string, content: string): Promise<void> => {
      const sanitizedContent = content.trimEnd();

      // Use JSON.stringify to safely escape the content string for Python
      const pythonCode = [
        `f=open('${filename}','w')`,
        `f.write(${JSON.stringify(sanitizedContent)})`,
        `f.close()`,
        `print('OK')`,
      ].join("\n");

      const result = await serialStreamManager.executeRawREPL(pythonCode, 8000);

      if (result.error) {
        throw new Error(`Failed to write ${filename}: ${result.error}`);
      }
    },
    [],
  );

  /**
   * Stop any running code on ESP32 (Ctrl-C × 2)
   */
  const stopRunningCode = useCallback(async (_port: SerialPortType): Promise<void> => {
    await serialStreamManager.sendData("\x03\x03");
    // Small delay for the interrupt to take effect
    await new Promise((r) => setTimeout(r, 200));
  }, []);

  /**
   * Soft reset ESP32 to run main.py (Ctrl-D)
   */
  const softResetESP32 = useCallback(async (_port: SerialPortType): Promise<void> => {
    await serialStreamManager.sendData("\x04");
  }, []);

  /**
   * Close serial port safely. Only tears down the stream manager if the
   * port being closed is the one managed by the singleton.
   */
  const closePort = useCallback(async (port: SerialPortType | null): Promise<void> => {
    // Only cleanup if this is the actual managed port
    const managedPort = serialStreamManager.getPort();
    if (port === managedPort) {
      await serialStreamManager.cleanup();
    }

    if (!port) return;
    try {
      await port.close();
    } catch {
      // Port may already be closed
    }
  }, []);

  return {
    checkSerialSupport,
    connectToESP32,
    writeFileToESP32,
    stopRunningCode,
    softResetESP32,
    closePort,
  };
}
