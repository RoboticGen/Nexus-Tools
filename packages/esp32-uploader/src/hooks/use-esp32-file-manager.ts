/**
 * ESP32 File Manager Hook
 * Handles fetching and listing files from ESP32
 */

import { useState, useCallback } from "react";

interface FileInfo {
  name: string;
  size?: number;
  isDirectory: boolean;
}

interface UseESP32FileManagerOptions {
  serialPort: any;
}

const SERIAL_DELAYS = {
  BEFORE_READ: 100,
  AFTER_COMMAND: 500,
  READ_TIMEOUT: 2000,
};

export function useESP32FileManager({ serialPort }: UseESP32FileManagerOptions) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check if the serial port is still accessible
   */
  const isPortValid = useCallback((): boolean => {
    if (!serialPort) return false;
    // Check if readable/writable streams are still accessible
    const hasReadable = serialPort.readable !== undefined && serialPort.readable !== null;
    const hasWritable = serialPort.writable !== undefined && serialPort.writable !== null;
    return hasReadable && hasWritable;
  }, [serialPort]);

  /**
   * Read response from serial port with timeout
   */
  const readSerialResponse = useCallback(async (
    reader: any,
    timeout: number = SERIAL_DELAYS.READ_TIMEOUT
  ): Promise<string> => {
    const decoder = new TextDecoder();
    let response = "";
    const startTime = Date.now();

    try {
      while (Date.now() - startTime < timeout) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          response += decoder.decode(value, { stream: true });
        }
        // Check if we got a prompt indicating command completion
        if (response.includes(">>>") || response.includes("...")) {
          break;
        }
      }
    } catch (e) {
      console.warn("Read timeout or error:", e);
    }

    return response;
  }, []);

  /**
   * Fetch files from ESP32 filesystem
   */
  const fetchFiles = useCallback(async (path: string = "/"): Promise<void> => {
    if (!serialPort) {
      setError("Serial port not available. Please connect to ESP32.");
      return;
    }

    if (!isPortValid()) {
      setError("Serial port connection lost. Please reconnect to ESP32.");
      setFiles([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    let reader: any;
    let writer: any;
    let retries = 0;
    const maxRetries = 3;

    try {
      // Retry logic for stream locking
      while (retries < maxRetries) {
        try {
          reader = serialPort.readable?.getReader();
          writer = serialPort.writable?.getWriter();
          if (reader && writer) break; // Successfully got streams
        } catch (e: any) {
          if (e.message?.includes("already locked") || e.message?.includes("lock")) {
            // Stream is locked, wait and retry
            retries++;
            if (retries >= maxRetries) {
              throw new Error(
                "Stream is locked by another operation. Please wait a moment and try again."
              );
            }
            await delay(200 * retries); // Exponential backoff
          } else {
            throw e;
          }
        }
      }

      if (!reader || !writer) {
        throw new Error(
          "Cannot access serial port. REPL may have closed the connection. Please wait a moment and try reconnecting."
        );
      }

      try {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        // Clear any pending data
        await delay(SERIAL_DELAYS.BEFORE_READ);

        // Send Ctrl+A to enter raw REPL mode
        await writer.write(encoder.encode("\x01"));
        await delay(100);

        // Clear buffer
        let clearResponse = "";
        try {
          let clearTimeout = 100;
          while (clearTimeout > 0) {
            const { value } = await Promise.race([
              reader.read(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error("timeout")), 50)
              ),
            ]);
            if (value) clearResponse += decoder.decode(value);
            clearTimeout -= 50;
          }
        } catch (e) {
          // Timeout expected, that's fine
        }

        // Send file listing command with marker at start
        // Using simpler single-line approach with exec to avoid echo issues
        const fileListCmd = `import os,sys\nfor f in sorted(os.listdir('${path}')):\n s=os.stat('${path}'+'/'+f if '${path}'!='/' else '/'+f)\n print(f+'|'+str(s[6])+'|'+str(int(s[0]&0x4000>0)))\n`;

        await writer.write(encoder.encode(fileListCmd));
        await writer.write(encoder.encode("\x04")); // Ctrl+D to execute

        // Wait for execution
        await delay(SERIAL_DELAYS.AFTER_COMMAND);

        // Read the response
        let response = "";
        let readTimeout = SERIAL_DELAYS.READ_TIMEOUT;
        const readStartTime = Date.now();

        while (Date.now() - readStartTime < readTimeout) {
          try {
            const { value, done } = await Promise.race([
              reader.read(),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error("timeout")), 200)
              ),
            ]);
            if (done) break;
            if (value) {
              response += decoder.decode(value, { stream: true });
            }
          } catch (e) {
            // Timeout expected during reading
            if (response.length > 0) break;
          }
        }

        // Parse the file list - extract only valid file entries (name|size|isdir format)
        const lines = response.split("\n");
        const fileList: FileInfo[] = [];
        
        for (const line of lines) {
          const trimmed = line.trim();
          // Skip empty lines and REPL control characters
          if (!trimmed) continue;
          
          // Only process lines with exactly 3 pipe-separated values where last 2 are numbers
          const parts = trimmed.split("|");
          if (parts.length !== 3) continue;
          
          // Validate format: name|number|number
          const sizeStr = parts[1];
          const isDirStr = parts[2];
          
          if (!/^\d+$/.test(sizeStr) || !/^[01]$/.test(isDirStr)) continue;
          
          const name = parts[0];
          const size = parseInt(sizeStr);
          const isDir = isDirStr === "1";
          
          // Skip entries with obviously corrupted names
          if (name.includes(">>>") || name.includes("...") || 
              name.includes("import") || name.includes("stat") ||
              name.includes("print") || name.includes("os.")) {
            continue;
          }
          
          fileList.push({
            name,
            size: isDir ? undefined : size,
            isDirectory: isDir,
          });
        }

        setFiles(fileList.sort((a, b) => {
          // Directories first, then alphabetical
          if (a.isDirectory !== b.isDirectory) {
            return a.isDirectory ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        }));
      } finally {
        // Release locks safely
        try {
          if (reader) reader.releaseLock();
        } catch (e) {
          // Already released or stream closed
        }
        try {
          if (writer) writer.releaseLock();
        } catch (e) {
          // Already released or stream closed
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to fetch files: ${msg}`);
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [serialPort, isPortValid, readSerialResponse]);

  /**
   * Download file from ESP32
   */
  const downloadFile = useCallback(async (filename: string): Promise<void> => {
    if (!serialPort) {
      setError("Serial port not available. Please connect to ESP32.");
      return;
    }

    if (!isPortValid()) {
      setError("Serial port connection lost. Please reconnect to ESP32.");
      return;
    }

    let reader: any;
    let writer: any;
    let retries = 0;
    const maxRetries = 3;

    try {
      // Retry logic for stream locking
      while (retries < maxRetries) {
        try {
          reader = serialPort.readable?.getReader();
          writer = serialPort.writable?.getWriter();
          if (reader && writer) break;
        } catch (e: any) {
          if (e.message?.includes("already locked") || e.message?.includes("lock")) {
            retries++;
            if (retries >= maxRetries) {
              throw new Error(
                "Stream is locked by another operation. Please wait a moment and try again."
              );
            }
            await delay(200 * retries);
          } else {
            throw e;
          }
        }
      }

      if (!reader || !writer) {
        throw new Error(
          "Cannot access serial port. REPL may have closed the connection. Please wait a moment and try reconnecting."
        );
      }

      try {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        // Clear any pending data
        await delay(SERIAL_DELAYS.BEFORE_READ);

        // Send Ctrl+C to interrupt any running code
        await writer.write(encoder.encode("\x03"));
        await delay(100);

        // Send Ctrl+A to enter raw REPL mode
        await writer.write(encoder.encode("\x01"));
        await delay(100);

        // Clear buffer by reading
        try {
          let clearAttempts = 0;
          while (clearAttempts < 5) {
            const { value } = await Promise.race([
              reader.read(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error("timeout")), 50)
              ),
            ]);
            if (!value) break;
            clearAttempts++;
          }
        } catch (e) {
          // Timeout expected
        }

        // Read file using a simpler approach with hex encoding
        const readCmd = `
f=open('${filename}','rb')
d=f.read()
f.close()
import binascii
print(binascii.hexlify(d).decode())
`;

        await writer.write(encoder.encode(readCmd));
        await writer.write(encoder.encode("\x04")); // Ctrl+D to execute

        // Wait for execution
        await delay(SERIAL_DELAYS.AFTER_COMMAND + 500);

        // Read the response
        let response = "";
        let readTimeout = SERIAL_DELAYS.READ_TIMEOUT * 3; // Longer timeout
        const readStartTime = Date.now();
        let lastDataTime = Date.now();

        while (Date.now() - readStartTime < readTimeout) {
          try {
            const { value, done } = await Promise.race([
              reader.read(),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error("timeout")), 100)
              ),
            ]);
            if (done) break;
            if (value) {
              response += decoder.decode(value, { stream: true });
              lastDataTime = Date.now();
            }
          } catch (e) {
            // If we haven't received data in 500ms, we're probably done
            if (response.length > 0 && Date.now() - lastDataTime > 500) {
              break;
            }
          }
        }

        // Debug logging
        console.log("Raw response:", response);

        // Extract hex data
        const lines = response.split("\n");
        let hexData = "";
        
        for (const line of lines) {
          const trimmed = line.trim();
          // Skip empty lines, prompts, and error messages
          if (!trimmed || trimmed.includes(">>>") || trimmed.includes("...") || 
              trimmed.includes("Traceback") || trimmed.includes("Error") ||
              trimmed.includes("OK")) {
            continue;
          }
          // Check if line contains valid hex characters only
          if (/^[0-9a-fA-F]*$/.test(trimmed)) {
            hexData += trimmed;
          }
        }

        if (!hexData) {
          // Try a different format: look for any hex-like output
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.includes(">>>") && /[0-9a-fA-F]{8,}/.test(trimmed)) {
              hexData = trimmed;
              break;
            }
          }
        }

        if (!hexData) {
          throw new Error(`Failed to extract file content. Response was: "${response.substring(0, 200)}"`);
        }

        // Convert hex to binary
        const bytes = new Uint8Array(hexData.length / 2);
        for (let i = 0; i < hexData.length; i += 2) {
          bytes[i / 2] = parseInt(hexData.substr(i, 2), 16);
        }

        // Try to save with File System Access API first
        try {
          if ("showSaveFilePicker" in window) {
            const handle = await (window as any).showSaveFilePicker({
              suggestedName: filename,
              types: [
                {
                  description: "All Files",
                  accept: { "*/*": [] },
                },
              ],
            });

            const writable = await handle.createWritable();
            await writable.write(bytes);
            await writable.close();

            setError(null);
            return;
          }
        } catch (e) {
          console.log("File System Access API not available or cancelled, using standard download");
        }

        // Fallback: Standard browser download
        const blob = new Blob([bytes], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setError(null);
      } finally {
        // Release locks safely
        try {
          if (reader) reader.releaseLock();
        } catch (e) {
          // Already released or stream closed
        }
        try {
          if (writer) writer.releaseLock();
        } catch (e) {
          // Already released or stream closed
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Download error:", err);
      setError(`Failed to download file: ${msg}`);
    }
  }, [serialPort, isPortValid]);

  /**
   * View file content as text
   */
  const viewFile = useCallback(async (filename: string): Promise<string> => {
    if (!serialPort) {
      throw new Error("Serial port not available. Please connect to ESP32.");
    }

    if (!isPortValid()) {
      throw new Error("Serial port connection lost. Please reconnect to ESP32.");
    }

    let reader: any;
    let writer: any;
    let retries = 0;
    const maxRetries = 3;

    try {
      // Retry logic for stream locking
      while (retries < maxRetries) {
        try {
          reader = serialPort.readable?.getReader();
          writer = serialPort.writable?.getWriter();
          if (reader && writer) break;
        } catch (e: any) {
          if (e.message?.includes("already locked") || e.message?.includes("lock")) {
            retries++;
            if (retries >= maxRetries) {
              throw new Error(
                "Stream is locked by another operation. Please wait a moment and try again."
              );
            }
            await delay(200 * retries);
          } else {
            throw e;
          }
        }
      }

      if (!reader || !writer) {
        throw new Error(
          "Cannot access serial port. REPL may have closed the connection. Please wait a moment and try reconnecting."
        );
      }

      try {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        await delay(SERIAL_DELAYS.BEFORE_READ);

        // Send Ctrl+C to interrupt
        await writer.write(encoder.encode("\x03"));
        await delay(100);

        // Send Ctrl+A to enter raw REPL mode
        await writer.write(encoder.encode("\x01"));
        await delay(100);

        // Clear buffer
        try {
          let clearAttempts = 0;
          while (clearAttempts < 5) {
            const { value } = await Promise.race([
              reader.read(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error("timeout")), 50)
              ),
            ]);
            if (!value) break;
            clearAttempts++;
          }
        } catch (e) {
          // Timeout expected
        }

        // Read file as text
        const readCmd = `
try:
    with open('${filename}','r') as f:
        print(f.read())
except:
    with open('${filename}','rb') as f:
        print(f.read())
`;

        await writer.write(encoder.encode(readCmd));
        await writer.write(encoder.encode("\x04")); // Ctrl+D

        await delay(SERIAL_DELAYS.AFTER_COMMAND + 300);

        // Read response
        let response = "";
        let readTimeout = SERIAL_DELAYS.READ_TIMEOUT * 2;
        const readStartTime = Date.now();
        let lastDataTime = Date.now();

        while (Date.now() - readStartTime < readTimeout) {
          try {
            const { value, done } = await Promise.race([
              reader.read(),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error("timeout")), 100)
              ),
            ]);
            if (done) break;
            if (value) {
              response += decoder.decode(value, { stream: true });
              lastDataTime = Date.now();
            }
          } catch (e) {
            if (response.length > 0 && Date.now() - lastDataTime > 500) {
              break;
            }
          }
        }

        // Extract file content from response (remove REPL markers)
        let content = response
          .split("\n")
          .filter(line => {
            const trimmed = line.trim();
            // Remove lines that are REPL prompts or control markers
            if (trimmed === ">" || trimmed === ">>" || trimmed === ">>>") return false;
            if (trimmed === "..." || trimmed.startsWith(">>>") || trimmed.startsWith("...")) return false;
            return true;
          })
          .join("\n")
          .trim();

        // Remove any trailing REPL prompt characters (>, >>, >>>)
        content = content.replace(/>>>+\s*$/, "").replace(/>+\s*$/, "").trim();

        return content;
      } finally {
        // Release locks safely
        try {
          if (reader) reader.releaseLock();
        } catch (e) {
          // Already released or stream closed
        }
        try {
          if (writer) writer.releaseLock();
        } catch (e) {
          // Already released or stream closed
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to view file: ${msg}`);
    }
  }, [serialPort, isPortValid]);

  /**
   * Refresh the file list
   */
  const refreshFiles = useCallback(() => {
    fetchFiles("/");
  }, [fetchFiles]);

  return {
    files,
    isLoading,
    error,
    fetchFiles,
    refreshFiles,
    downloadFile,
    viewFile,
  };
}

/**
 * Simple delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
