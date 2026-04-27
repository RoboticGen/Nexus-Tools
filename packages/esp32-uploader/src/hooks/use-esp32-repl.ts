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
  const [isAwaitingContinuation, setIsAwaitingContinuation] = useState(false);
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
      setIsAwaitingContinuation(false);
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
        // In continuation mode users may accidentally type the visible
        // prompt prefix ("... "). Strip it before sending to the device.
        const preparedCommand =
          isAwaitingContinuation && /^\s*\.\.\.\s?/.test(command)
            ? command.replace(/^\s*\.\.\.\s?/, "")
            : command;

        const raw = await serialStreamManager.executeREPLCommand(preparedCommand, 8000, {
          interruptBeforeCommand: !isAwaitingContinuation,
        });

        const normalized = raw
          .replace(/\r/g, "")
          // Strip control characters that can appear during USB glitches.
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
        
        // Split once and reuse for both continuation detection and parsing
        const lines = normalized.split('\n');
        
        // Detect continuation mode by checking the LAST actual prompt in the output
        let lastPrompt = ">>>";  // default
        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i].trim();
          if (line.startsWith(">>>") || line.startsWith("...")) {
            lastPrompt = line.startsWith(">>>") ? ">>>" : "...";
            break;
          }
        }
        setIsAwaitingContinuation(lastPrompt === "...");

        // Check for device restart indicators
        if (raw.includes("MPY:") || raw.includes(">>") || raw.includes("firmware")) {
          showNotification(
            "info",
            "Device Reset Detected",
            "ESP32 has been reset. REPL session restarted."
          );
        }

        // Parse output and errors
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
            // Regular output (skip exact command echo)
            if (line !== preparedCommand) {
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
    [isConnected, isAwaitingContinuation, showNotification],
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
    setIsAwaitingContinuation(false);
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
    isAwaitingContinuation,
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