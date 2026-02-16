/**
 * ESP32 REPL Hook
 * Handles MicroPython REPL communication
 */

import { useState, useCallback, useRef } from "react";

interface REPLResult {
  output: string;
  error: string;
}

export function useESP32REPL(serialPort: any) {
  const [isConnected, setIsConnected] = useState(false);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter | null>(null);
  const outputBufferRef = useRef<string>("");

  /**
   * Connect to REPL mode
   */
  const connectToREPL = useCallback(async () => {
    if (!serialPort) {
      throw new Error("Serial port not available");
    }

    try {
      // Get reader and writer
      const reader = serialPort.readable?.getReader();
      const writer = serialPort.writable?.getWriter();

      if (!reader || !writer) {
        throw new Error("Unable to get serial port streams");
      }

      readerRef.current = reader;
      writerRef.current = writer;

      // Enter raw REPL mode (Ctrl+A)
      await writer.write(new TextEncoder().encode('\x01'));
      await delay(100);

      // Exit raw REPL mode back to normal REPL (Ctrl+B)
      await writer.write(new TextEncoder().encode('\x02'));
      await delay(200);

      // Send Ctrl+C twice to stop any running code and get clean prompt
      await writer.write(new TextEncoder().encode('\x03\x03'));
      await delay(200);

      setIsConnected(true);
      
      // Start reading output in the background
      startReading();

    } catch (error) {
      // Clean up on error
      if (readerRef.current) {
        try {
          readerRef.current.releaseLock();
        } catch (e) {
          // Already released
        }
        readerRef.current = null;
      }
      if (writerRef.current) {
        try {
          writerRef.current.releaseLock();
        } catch (e) {
          // Already released
        }
        writerRef.current = null;
      }
      throw error;
    }
  }, [serialPort]);

  /**
   * Start reading output from the device
   */
  const startReading = useCallback(async () => {
    const reader = readerRef.current;
    if (!reader) return;

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        outputBufferRef.current += text;
      }
    } catch (error) {
      console.warn("REPL reading stopped:", error);
    }
  }, []);

  /**
   * Execute a command in the REPL
   */
  const executeCommand = useCallback(async (command: string): Promise<REPLResult> => {
    if (!isConnected || !writerRef.current) {
      throw new Error("REPL not connected");
    }

    try {
      // Clear output buffer
      outputBufferRef.current = "";

      // Send the command
      const encoder = new TextEncoder();
      await writerRef.current.write(encoder.encode(command + '\r\n'));

      // Wait for output
      await delay(500);

      // Read accumulated output
      const output = outputBufferRef.current;
      outputBufferRef.current = "";

      // Separate output and errors (basic heuristic)
      const lines = output.split('\n');
      const outputLines: string[] = [];
      const errorLines: string[] = [];

      for (const line of lines) {
        if (line.includes('Traceback') || line.includes('Error:') || line.includes('Exception:')) {
          errorLines.push(line);
        } else if (line.trim() && !line.startsWith('>>>') && !line.startsWith('...')) {
          outputLines.push(line);
        }
      }

      return {
        output: outputLines.join('\n').trim(),
        error: errorLines.join('\n').trim()
      };

    } catch (error) {
      throw new Error(`Command execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [isConnected]);

  /**
   * Send Ctrl+C (KeyboardInterrupt)
   */
  const sendCtrlC = useCallback(async () => {
    if (!writerRef.current) return;
    
    try {
      await writerRef.current.write(new TextEncoder().encode('\x03'));
    } catch (error) {
      console.warn("Failed to send Ctrl+C:", error);
    }
  }, []);

  /**
   * Send Ctrl+D (Soft reset)
   */
  const sendCtrlD = useCallback(async () => {
    if (!writerRef.current) return;
    
    try {
      await writerRef.current.write(new TextEncoder().encode('\x04'));
    } catch (error) {
      console.warn("Failed to send Ctrl+D:", error);
    }
  }, []);

  /**
   * Disconnect from REPL
   */
  const disconnect = useCallback(async () => {
    try {
      // Release streams first
      if (readerRef.current) {
        try {
          readerRef.current.releaseLock();
        } catch (e) {
          // Already released or stream closed
        }
        readerRef.current = null;
      }
      if (writerRef.current) {
        try {
          writerRef.current.releaseLock();
        } catch (e) {
          // Already released or stream closed
        }
        writerRef.current = null;
      }

      // Close the underlying serial port
      if (serialPort) {
        try {
          await serialPort.close();
        } catch (e) {
          console.warn("Error closing serial port:", e);
        }
      }

      setIsConnected(false);
    } catch (error) {
      console.warn("Error disconnecting REPL:", error);
    }
  }, [serialPort]);

  return {
    isConnected,
    connectToREPL,
    executeCommand,
    sendCtrlC,
    sendCtrlD,
    disconnect,
  };
}

/**
 * Simple delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}