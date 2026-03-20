/**
 * ESP32 File Manager Hook
 * Handles fetching, downloading, viewing, and deleting files on ESP32.
 *
 * All operations use Raw REPL mode via the shared SerialStreamManager
 * for reliable, structured output without prompt/echo contamination.
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

export function useESP32FileManager({ serialPort }: UseESP32FileManagerOptions) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Ensure the stream manager is ready, initialising if needed. */
  const ensureReady = useCallback(async () => {
    if (!serialPort) {
      throw new Error("Serial port not available. Please connect to ESP32.");
    }
    if (!serialStreamManager.isReady()) {
      await serialStreamManager.initialize(serialPort);
    }
  }, [serialPort]);

  /** Escape a path for safe use inside a Python string literal. */
  const escapePath = (p: string): string =>
    p.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

  // ── Fetch Files (list directory) ─────────────────────────────────────────

  const fetchFiles = useCallback(
    async (path: string = "/"): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        await ensureReady();

        const safePath = escapePath(path);

        // MicroPython script that prints one line per entry:
        //   name|size|0  (file)
        //   name|0|1     (directory)
        const pythonCode = [
          `import os`,
          `p='${safePath}'`,
          `for f in sorted(os.listdir(p)):`,
          `  fp=p+('/'+f if p!='/' else '/'+f)`,
          `  s=os.stat(fp)`,
          `  d=1 if s[0]&0x4000 else 0`,
          `  print(f+'|'+str(s[6])+'|'+str(d))`,
        ].join("\n");

        const result = await serialStreamManager.executeRawREPL(pythonCode, 8000);

        if (result.error) {
          throw new Error(result.error);
        }

        // Parse clean output — each line is "name|size|isDir"
        const fileList: FileInfo[] = [];
        for (const line of result.output.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          const parts = trimmed.split("|");
          if (parts.length < 3) continue;

          const name = parts[0];
          const size = parseInt(parts[1], 10) || 0;
          const isDirectory = parts[2] === "1";

          fileList.push({
            name,
            size: isDirectory ? undefined : size,
            isDirectory,
          });
        }

        // Directories first, then alphabetical
        fileList.sort((a, b) => {
          if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
          return a.name.localeCompare(b.name);
        });

        setFiles(fileList);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Failed to fetch files: ${msg}`);
        setFiles([]);
      } finally {
        setIsLoading(false);
      }
    },
    [ensureReady],
  );

  // ── Download File ────────────────────────────────────────────────────────

  const downloadFile = useCallback(
    async (filename: string): Promise<void> => {
      try {
        await ensureReady();

        const safeName = escapePath(filename);

        // Read file as hex using binascii
        const pythonCode = [
          `import binascii`,
          `with open('${safeName}','rb') as f:`,
          `  print(binascii.hexlify(f.read()).decode())`,
        ].join("\n");

        const result = await serialStreamManager.executeRawREPL(pythonCode, 15000);

        if (result.error) {
          throw new Error(result.error);
        }

        const hexData = result.output.trim();
        if (!hexData || !/^[0-9a-fA-F]+$/.test(hexData)) {
          throw new Error("Failed to read file content from device");
        }

        // Convert hex → binary
        const bytes = new Uint8Array(hexData.length / 2);
        for (let i = 0; i < hexData.length; i += 2) {
          bytes[i / 2] = parseInt(hexData.substring(i, i + 2), 16);
        }

        // Try File System Access API first (modern browsers)
        try {
          if ("showSaveFilePicker" in window) {
            const handle = await (window as any).showSaveFilePicker({
              suggestedName: filename.split("/").pop() || filename,
              types: [{ description: "All Files", accept: { "*/*": [] } }],
            });
            const writable = await handle.createWritable();
            await writable.write(bytes);
            await writable.close();
            setError(null);
            return;
          }
        } catch {
          // User cancelled or API unavailable — fall through
        }

        // Fallback: standard download via link
        const blob = new Blob([bytes], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename.split("/").pop() || filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setError(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Failed to download file: ${msg}`);
      }
    },
    [ensureReady],
  );

  // ── View File ────────────────────────────────────────────────────────────

  const viewFile = useCallback(
    async (filename: string): Promise<string> => {
      await ensureReady();

      const safeName = escapePath(filename);

      const pythonCode = [
        `with open('${safeName}','r') as f:`,
        `  print(f.read())`,
      ].join("\n");

      const result = await serialStreamManager.executeRawREPL(pythonCode, 8000);

      if (result.error) {
        throw new Error(`Failed to view file: ${result.error}`);
      }

      return result.output;
    },
    [ensureReady],
  );

  // ── Delete File ──────────────────────────────────────────────────────────

  const deleteFile = useCallback(
    async (filename: string): Promise<void> => {
      await ensureReady();

      const safeName = escapePath(filename);

      const pythonCode = [
        `import os`,
        `os.remove('${safeName}')`,
        `print('OK')`,
      ].join("\n");

      const result = await serialStreamManager.executeRawREPL(pythonCode, 5000);

      if (result.error) {
        throw new Error(`Failed to delete file: ${result.error}`);
      }

      // Refresh file list after successful deletion
      await fetchFiles("/");
    },
    [ensureReady, fetchFiles],
  );

  // ── Refresh ──────────────────────────────────────────────────────────────

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
