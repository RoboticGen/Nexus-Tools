/**
 * ESP32 File Manager Hook
 * Handles fetching and listing files from ESP32
 */

import { useState, useCallback } from "react";
import { serialStreamManager } from "../utils/serial-stream-manager";

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

    try {
      // Initialize shared stream manager 
      if (!serialStreamManager.isReady()) {
        console.log('Initializing serial stream manager...');
        await serialStreamManager.initialize(serialPort);
        console.log('Serial stream manager initialized');
      }

      // Clear any pending data and send command
      const result = await new Promise<string>((resolve, reject) => {
        const encoder = new TextEncoder();
        let response = "";
        const timeout = SERIAL_DELAYS.READ_TIMEOUT * 3;
        console.log('Sending file listing command for path:', path);

        // Set up listener BEFORE sending command
        const unsubscribe = serialStreamManager.addListener((data) => {
          console.log('Received data chunk:', data.substring(0, 100));
          response += data;
          
          // Check if we have complete output (should end with >>> prompt and pipe-separated values)
          if (response.includes(">>>") && response.includes("|")) {
            console.log('Complete response received, resolving...');
            unsubscribe();
            resolve(response);
          }
        });

        // Set timeout
        const timeoutHandle = setTimeout(() => {
          console.log('File listing timeout reached');
          unsubscribe();
          if (response) {
            resolve(response); // Use what we got
          } else {
            reject(new Error("Timeout waiting for file listing"));
          }
        }, timeout);

        // Now send command using executeREPLCommand helper
        // MicroPython os.stat() returns a tuple: [mode, ino, dev, nlink, uid, gid, size, atime, mtime, ctime]
        // Index 0=mode, 6=size
        const pythonCmd = `import os;[print(f+'|'+str(os.stat('${path}'+'/'+f if '${path}'!='/' else '/'+f)[6])+'|'+str(int(os.stat('${path}'+'/'+f if '${path}'!='/' else '/'+f)[0]&0x4000>0))) for f in sorted(os.listdir('${path}'))]`;
        
        serialStreamManager.executeREPLCommand(pythonCmd, timeout)
          .then(() => {
            // Response collected via listener
            clearTimeout(timeoutHandle);
            setTimeout(() => {
              unsubscribe();
              if (response && response.includes("|")) {
                resolve(response);
              } else if (response) {
                resolve(response);
              } else {
                reject(new Error("No valid response from device"));
              }
            }, 500);
          })
          .catch((err) => {
            console.error('Error executing file listing:', err);
            clearTimeout(timeoutHandle);
            unsubscribe();
            if (response && response.includes("|")) {
              resolve(response);
            } else {
              reject(err);
            }
          });
      });

      // Parse the response - filter out command echoes and prompts
      const lines = result.split('\n')
        .map(line => line.trim())
        .filter(line => {
          // Skip empty lines, prompts, and command echoes
          if (!line || line.includes('>>>') || line.includes('raw REPL') || 
              line.includes('import ') || line.includes('for f in') ||
              line.includes('os.stat') || line.includes('os.listdir') ||
              line.includes('s=') || line.includes('print(')) {
            return false;
          }
          // Only keep lines with pipe separator (actual file data)
          return line.includes('|');
        });

      const fileList: FileInfo[] = lines.map(line => {
        const parts = line.split('|');
        if (parts.length >= 3) {
          const name = parts[0].trim();
          const size = parseInt(parts[1]) || 0;
          const isDirectory = parts[2] === '1' || parts[2] === 'True';
          
          return { name, size: isDirectory ? undefined : size, isDirectory };
        }
        return null;
      }).filter((item): item is FileInfo => item !== null);

      if (fileList.length === 0 && result) {
        console.warn('No files parsed from response:', result);
      }

      setFiles(fileList.sort((a, b) => {
        // Directories first, then alphabetical
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      }));
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

    try {
      // Initialize shared stream manager 
      if (!serialStreamManager.isReady()) {
        await serialStreamManager.initialize(serialPort);
      }

      // Set up listener first, then send command
      const response = await new Promise<string>((resolve, reject) => {
        let responseData = "";
        const timeout = SERIAL_DELAYS.READ_TIMEOUT * 3;
        console.log('Setting up file download listener...');

        // Set up listener BEFORE sending command
        const unsubscribe = serialStreamManager.addListener((data) => {
          console.log('Download: received chunk:', data.substring(0, 50));
          responseData += data;
        });

        // Set timeout
        const timeoutHandle = setTimeout(() => {
          unsubscribe();
          if (responseData) {
            resolve(responseData); // Use what we got
          } else {
            reject(new Error("Timeout waiting for file content"));
          }
        }, timeout);

        // Execute REPL command to download file as hex
        const escapedFilename = filename.replace(/\\/g, '\\\\').replace(/'/g, "\\'" );
        const pythonCmd = `import binascii;with open('${escapedFilename}','rb') as f: print(binascii.hexlify(f.read()).decode())`;
        
        serialStreamManager.executeREPLCommand(pythonCmd, timeout)
          .then(() => {
            clearTimeout(timeoutHandle);
            setTimeout(() => {
              unsubscribe();
              resolve(responseData);
            }, 300);
          })
          .catch((err) => {
            console.error('Error executing file download:', err);
            clearTimeout(timeoutHandle);
            unsubscribe();
            if (responseData) {
              resolve(responseData);
            } else {
              reject(err);
            }
          });
      });

      // Process the response
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

      // Handle file download
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

    try {
      // Initialize shared stream manager 
      if (!serialStreamManager.isReady()) {
        await serialStreamManager.initialize(serialPort);
      }

      // Use executeREPLCommand with a simple one-liner
      const escapedFilename = filename.replace(/\\/g, '\\\\').replace(/'/g, "\\'" );
      const pythonCmd = `with open('${escapedFilename}','r') as f: print(f.read())`;
      
      const response = await serialStreamManager.executeREPLCommand(pythonCmd, SERIAL_DELAYS.READ_TIMEOUT * 2);

      // Extract file content from response (remove prompts and markers)
      const lines = response.split("\n");
      let fileContent = "";

      for (const line of lines) {
        const trimmed = line.trim();
        
        // Skip empty lines, prompts, and control markers
        if (!trimmed || trimmed.includes(">>>") || trimmed.includes("...") || 
            trimmed.includes("raw REPL") || trimmed.includes("OK")) {
          continue;
        }
        
        // Add the line to content
        fileContent += line + "\n";
      }

      return fileContent.trim();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to view file: ${msg}`);
    }
  }, [serialPort, isPortValid]);

  /**
   * Delete a file from ESP32 filesystem
   */
  const deleteFile = useCallback(async (filename: string): Promise<void> => {
    if (!serialPort) {
      throw new Error("Serial port not available. Please connect to ESP32.");
    }

    if (!isPortValid()) {
      throw new Error("Serial port connection lost. Please reconnect to ESP32.");
    }

    try {
      // Initialize shared stream manager 
      if (!serialStreamManager.isReady()) {
        await serialStreamManager.initialize(serialPort);
      }

      // Use executeREPLCommand for file deletion with one-liner
      const escapedFilename = filename.replace(/\\/g, '\\\\').replace(/'/g, "\\'" );
      const pythonCmd = `import os;' '.join([os.remove('${escapedFilename}'),print('OK')]) or print('OK') if os.path.exists('${escapedFilename}') else print('NOT_FOUND')`;
      
      const response = await serialStreamManager.executeREPLCommand(pythonCmd, SERIAL_DELAYS.READ_TIMEOUT);
      
      // Check if deletion succeeded
      if (!response.includes("OK")) {
        throw new Error(`Failed to delete file: ${response}`);
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to delete file: ${msg}`);
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
    deleteFile,
  };
}

/**
 * Simple delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
