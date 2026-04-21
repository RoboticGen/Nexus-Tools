/**
 * ESP32 REPL Hook
 * Handles interactive MicroPython REPL communication.
 *
 * Uses the shared SerialStreamManager for all I/O so it coexists
 * safely with file operations and code uploads.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { notification } from "antd";
import { serialStreamManager } from "../utils/serial-stream-manager";

interface REPLResult {
  output: string;
  error: string;
}

interface UseESP32REPLOptions {
  onNotification?: (type: "success" | "warning" | "error" | "info", message: string, description: string) => void;
}

export function useESP32REPL(serialPort: any, options?: UseESP32REPLOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const outputBufferRef = useRef<string>("");
  const unsubRef = useRef<(() => void) | null>(null);

  // Notification helper
  const showNotification = useCallback((
    type: "success" | "warning" | "error" | "info",
    message: string,
    description: string
  ) => {
    if (options?.onNotification) {
      options.onNotification(type, message, description);
    } else {
      notification[type]({
        message,
        description,
        duration: 2,
        placement: "topRight",
      });
    }
  }, [options]);

  // ── Connect to REPL ────────────────────────────────────────────────────

  const connectToREPL = useCallback(async () => {
    if (!serialPort) {
      throw new Error("Serial port not available");
    }

    try {
      // Ensure stream manager is initialised with this port
      await serialStreamManager.initialize(serialPort);

      // Get to a clean normal-mode prompt: Ctrl-C × 2, then Ctrl-B
      await serialStreamManager.sendData("\x03\x03");
      await delay(100);
      await serialStreamManager.sendData("\x02");
      await delay(100);

      // Subscribe to output
      if (unsubRef.current) unsubRef.current();
      unsubRef.current = serialStreamManager.addListener((data) => {
        outputBufferRef.current += data;
      });

      // Clear any residual output from connection sequence
      await delay(200);
      outputBufferRef.current = "";

      setIsConnected(true);
    } catch (error) {
      showNotification(
        "error",
        "Connection Failed",
        `Could not connect to REPL: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }, [serialPort, showNotification]);

  // ── Execute Command ────────────────────────────────────────────────────

  const executeCommand = useCallback(
    async (command: string): Promise<REPLResult> => {
      if (!isConnected || !serialStreamManager.isReady()) {
        showNotification(
          "error",
          "REPL Not Connected",
          "Cannot execute command. REPL connection lost."
        );
        throw new Error("REPL not connected");
      }

      try {
        const raw = await serialStreamManager.executeREPLCommand(command, 5000);

        // Check for device restart indicators
        if (raw.includes("MPY:") || raw.includes(">>") || raw.includes("firmware")) {
          showNotification(
            "info",
            "Device Reset Detected",
            "ESP32 has been reset. REPL session restarted."
          );
        }

        // Parse output and errors
        const lines = raw.split("\n");
        const outputLines: string[] = [];
        const errorLines: string[] = [];
        let inError = false;

        for (const line of lines) {
          // Skip prompt lines
          if (line.trim().startsWith(">>>") || line.trim().startsWith("...")) {
            inError = false;
            continue;
          }
          
          // Detect error start
          if (line.includes("Traceback")) {
            inError = true;
            errorLines.push(line);
          } else if (inError) {
            // Continue capturing error lines until we hit a blank line or prompt
            if (line.trim()) {
              errorLines.push(line);
            } else {
              inError = false;
            }
          } else if (line.trim()) {
            // Regular output (skip the echo of the command itself)
            if (line.trim() !== command.trim()) {
              outputLines.push(line);
            }
          }
        }

        // Show error notification if there's an error
        if (errorLines.length > 0) {
          showNotification(
            "error",
            "Execution Error",
            errorLines[0] || "An error occurred during command execution"
          );
        }

        return {
          output: outputLines.join("\n").trim(),
          error: errorLines.join("\n").trim(),
        };
      } catch (error) {
        showNotification(
          "error",
          "Command Execution Failed",
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
        throw error;
      }
    },
    [isConnected, showNotification],
  );

  // ── Ctrl-C / Ctrl-D helpers ────────────────────────────────────────────

  const sendCtrlC = useCallback(async () => {
    if (!serialStreamManager.isReady()) {
      showNotification(
        "warning",
        "Not Connected",
        "Cannot send Ctrl+C. REPL is not connected."
      );
      return;
    }
    try {
      await serialStreamManager.sendData("\x03");
    } catch (error) {
      showNotification(
        "error",
        "Send Failed",
        `Failed to send Ctrl+C: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }, [showNotification]);

  const sendCtrlD = useCallback(async () => {
    if (!serialStreamManager.isReady()) {
      showNotification(
        "warning",
        "Not Connected",
        "Cannot send Ctrl+D. REPL is not connected."
      );
      return;
    }
    try {
      await serialStreamManager.sendData("\x04");
    } catch (error) {
      showNotification(
        "error",
        "Send Failed",
        `Failed to send Ctrl+D: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }, [showNotification]);

  // ── Disconnect ─────────────────────────────────────────────────────────

  const disconnect = useCallback(async () => {
    // Remove listener first
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    // Send Ctrl-D for a clean exit if still connected
    if (serialStreamManager.isReady()) {
      try {
        await serialStreamManager.sendData("\x04");
      } catch {
        // Port may already be closed
      }
    }

    setIsConnected(false);
    outputBufferRef.current = "";
  }, [showNotification]);

  // ── Cleanup on unmount / port change ───────────────────────────────────

  useEffect(() => {
    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, []);

  return {
    isConnected,
    connectToREPL,
    executeCommand,
    sendCtrlC,
    sendCtrlD,
    disconnect,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}