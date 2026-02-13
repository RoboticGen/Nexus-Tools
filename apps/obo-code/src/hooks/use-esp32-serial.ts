/**
 * ESP32 Serial Communication Hook
 * Handles Web Serial API connections and file operations
 */

import { useCallback } from "react";

import { ESP32_USB_FILTERS, DEFAULT_SERIAL_OPTIONS, REPL_CONTROL, SERIAL_DELAYS } from "@/constants/esp32";

interface UseESP32SerialOptions {
  baudRate: number;
}

// Type alias for Serial Port (Web Serial API isn't in standard TS lib)
type SerialPortType = any;

export function useESP32Serial({ baudRate }: UseESP32SerialOptions) {
  /**
   * Check if Web Serial API is supported in this browser
   */
  const checkSerialSupport = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    
    const hasSerial = 'serial' in navigator;
    const isSecureContext = window.isSecureContext || 
                           window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1' ||
                           window.location.protocol === 'https:';
    
    return hasSerial && isSecureContext;
  }, []);

  /**
   * Connect to ESP32 via Web Serial API
   * Returns the serial port object
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

      return port;
    } catch (error: any) {
      // Handle specific error cases with user-friendly messages
      if (error.name === 'NotFoundError') {
        if (error.message && error.message.includes('No port selected')) {
          throw new Error('Connection cancelled - no device was selected');
        } else {
          throw new Error('ESP32 device not found. Please check your USB connection and try again.');
        }
      } else if (error.name === 'NetworkError') {
        throw new Error('Failed to open connection to ESP32. Device may be in use by another application.');
      } else if (error.name === 'InvalidStateError') {
        throw new Error('ESP32 device is already connected or in an invalid state.');
      } else if (error.name === 'NotSupportedError') {
        throw new Error('Your browser does not support connecting to this type of device.');
      } else if (error.name === 'SecurityError') {
        throw new Error('Connection blocked for security reasons. Make sure you\'re using HTTPS or localhost.');
      } else {
        // Generic fallback for unknown errors
        throw new Error(`Connection failed: ${error.message || 'Unknown error occurred'}`);
      }
    }
  }, [baudRate]);

  /**
   * Write a file to ESP32 using MicroPython REPL
   */
  const writeFileToESP32 = useCallback(async (
    port: SerialPortType, 
    filename: string, 
    content: string
  ): Promise<void> => {
    const writer = port.writable?.getWriter();
    if (!writer) throw new Error("Cannot write to ESP32 port");

    const encoder = new TextEncoder();
    
    try {
      // Enter raw REPL mode
      await writer.write(encoder.encode(REPL_CONTROL.CTRL_A));
      await delay(SERIAL_DELAYS.AFTER_CTRL_A);
      
      // Write file creation command
      const escapedContent = content.replace(/'/g, "\\'");
      const fileCommand = `
with open('${filename}', 'w') as f:
    f.write('''${escapedContent}
''')
print('File ${filename} saved successfully')
`;
      
      await writer.write(encoder.encode(fileCommand));
      await writer.write(encoder.encode(REPL_CONTROL.CTRL_D));
      
      // Wait for execution
      await delay(SERIAL_DELAYS.AFTER_FILE_WRITE);
      
    } finally {
      writer.releaseLock();
    }
  }, []);

  /**
   * Stop any running code on ESP32
   */
  const stopRunningCode = useCallback(async (port: SerialPortType): Promise<void> => {
    const writer = port.writable?.getWriter();
    if (!writer) return;

    try {
      // Send Ctrl+C twice to stop running code
      await writer.write(new TextEncoder().encode(REPL_CONTROL.CTRL_C + REPL_CONTROL.CTRL_C));
      await delay(SERIAL_DELAYS.AFTER_CTRL_C);
    } finally {
      writer.releaseLock();
    }
  }, []);

  /**
   * Soft reset ESP32 to run main.py
   */
  const softResetESP32 = useCallback(async (port: SerialPortType): Promise<void> => {
    const writer = port.writable?.getWriter();
    if (!writer) return;

    try {
      await writer.write(new TextEncoder().encode(REPL_CONTROL.CTRL_D));
    } finally {
      writer.releaseLock();
    }
  }, []);

  /**
   * Close serial port safely
   */
  const closePort = useCallback(async (port: SerialPortType | null): Promise<void> => {
    if (!port) return;
    
    try {
      await port.close();
    } catch (e) {
      console.warn("Failed to close port:", e);
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

/**
 * Simple delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
