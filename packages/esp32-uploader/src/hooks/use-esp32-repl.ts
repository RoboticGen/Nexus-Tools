/**
 * ESP32 REPL Hook
 * Handles interactive MicroPython REPL communication.
 *
 * Uses the shared SerialStreamManager for all I/O so it coexists
 * safely with file operations and code uploads.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { serialStreamManager } from "../utils/serial-stream-manager";

interface REPLResult {
  output: string;
  error: string;
}

export function useESP32REPL(serialPort: any) {
  const [isConnected, setIsConnected] = useState(false);
  const outputBufferRef = useRef<string>("");
  const unsubRef = useRef<(() => void) | null>(null);

  // ── Connect to REPL ────────────────────────────────────────────────────

  const connectToREPL = useCallback(async () => {
    if (!serialPort) {
      throw new Error("Serial port not available");
    }

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
  }, [serialPort]);

  // ── Execute Command ────────────────────────────────────────────────────

  const executeCommand = useCallback(
    async (command: string): Promise<REPLResult> => {
      if (!isConnected || !serialStreamManager.isReady()) {
        throw new Error("REPL not connected");
      }

      // Clear buffer, send command, wait for output
      outputBufferRef.current = "";
      await serialStreamManager.sendData(command + "\r\n");
      await delay(500);

      const raw = outputBufferRef.current;
      outputBufferRef.current = "";

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

      return {
        output: outputLines.join("\n").trim(),
        error: errorLines.join("\n").trim(),
      };
    },
    [isConnected],
  );

  // ── Ctrl-C / Ctrl-D helpers ────────────────────────────────────────────

  const sendCtrlC = useCallback(async () => {
    if (!serialStreamManager.isReady()) return;
    await serialStreamManager.sendData("\x03");
  }, []);

  const sendCtrlD = useCallback(async () => {
    if (!serialStreamManager.isReady()) return;
    await serialStreamManager.sendData("\x04");
  }, []);

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
  }, []);

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