 /**
 * ESP32 REPL Hook
 * Handles MicroPython REPL communication
 */

import { useState, useCallback, useRef } from "react";
import { serialStreamManager } from "../utils/serial-stream-manager";

interface REPLResult {
  output: string;
  error: string;
}

export function useESP32REPL(serialPort: any) {
  const [isConnected, setIsConnected] = useState(false);
  const outputBufferRef = useRef<string>("");
  const outputListenerRef = useRef<(() => void) | null>(null);

  /**
   * Connect to REPL mode
   */
  const connectToREPL = useCallback(async () => {
    if (!serialPort) {
      throw new Error("Serial port not available");
    }

    try {
      // Initialize shared stream manager 
      if (!serialStreamManager.isReady()) {
        await serialStreamManager.initialize(serialPort);
      }

      // Execute REPL setup with exclusive access
      await serialStreamManager.executeOperation(async (writer) => {
        // Enter raw REPL mode (Ctrl+A)
        await writer.write(new TextEncoder().encode('\x01'));
        await delay(100);

        // Exit raw REPL mode back to normal REPL (Ctrl+B)
        await writer.write(new TextEncoder().encode('\x02'));
        await delay(200);

        // Send Ctrl+C twice to stop any running code and get clean prompt
        await writer.write(new TextEncoder().encode('\x03\x03'));
        await delay(200);
      });

      setIsConnected(true);
      
      // Start listening to output
      startReading();

    } catch (error) {
      // Clean up on error
      setIsConnected(false);
      throw error;
    }
  }, [serialPort]);

  /**
   * Start reading output from the device
   */
  const startReading = useCallback(async () => {
    if (!serialStreamManager.isReady()) return;

    // Clear any existing listener
    if (outputListenerRef.current) {
      outputListenerRef.current();
      outputListenerRef.current = null;
    }

    // Add listener for REPL output
    outputListenerRef.current = serialStreamManager.addListener((data) => {
      outputBufferRef.current += data;
    });
  }, []);

  /**
   * Execute a command in the REPL
   */
  const executeCommand = useCallback(async (command: string): Promise<REPLResult> => {
    if (!isConnected || !serialStreamManager.isReady()) {
      throw new Error("REPL not connected");
    }

    try {
      // Clear output buffer
      outputBufferRef.current = "";

      // Execute command using shared stream manager
      await serialStreamManager.executeOperation(async (writer) => {
        // Send the command
        const encoder = new TextEncoder();
        await writer.write(encoder.encode(command + '\r\n'));
      });

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
    if (!serialStreamManager.isReady()) return;
    
    try {
      await serialStreamManager.executeOperation(async (writer) => {
        await writer.write(new TextEncoder().encode('\x03'));
      });
    } catch (error) {
      console.warn("Failed to send Ctrl+C:", error);
    }
  }, []);

  /**
   * Send Ctrl+D (Soft reset)
   */
  const sendCtrlD = useCallback(async () => {
    if (!serialStreamManager.isReady()) return;
    
    try {
      await serialStreamManager.executeOperation(async (writer) => {
        await writer.write(new TextEncoder().encode('\x04'));
      });
    } catch (error) {
      console.warn("Failed to send Ctrl+D:", error);
    }
  }, []);

  /**
   * Disconnect from REPL
   */
  const disconnect = useCallback(async () => {
    try {
      // Clean up listener
      if (outputListenerRef.current) {
        outputListenerRef.current();
        outputListenerRef.current = null;
      }

      // Exit REPL mode by sending Ctrl+D (soft reset) if still connected
      if (serialStreamManager.isReady() && serialPort) {
        try {
          await serialStreamManager.executeOperation(async (writer) => {
            await writer.write(new TextEncoder().encode('\x04'));
          });
          await delay(100);
        } catch (e) {
          // Port may already be closed
        }
      }

      setIsConnected(false);
      outputBufferRef.current = "";
    } catch (error) {
      console.warn("Error disconnecting REPL:", error);
      setIsConnected(false);
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