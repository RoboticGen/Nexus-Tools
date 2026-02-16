/**
 * React hook for ESP32 file manager operations
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { FileSystemManager } from '../utils/file-system-manager';
import type {
  FileManagerState,
  FileManagerOptions,
} from '../types/file-manager';

const INITIAL_STATE: FileManagerState = {
  connected: false,
  currentPath: '/',
  files: [],
  stats: null,
  deviceInfo: null,
  operations: [],
  error: null,
};

export function useFileManager(serialPort: any) {
  const [state, setState] = useState<FileManagerState>(INITIAL_STATE);
  const managerRef = useRef<FileSystemManager | null>(null);

  /**
   * Initialize file manager connection
   */
  const connect = useCallback(
    async (options?: FileManagerOptions) => {
      try {
        setState((prev) => ({ ...prev, error: null }));

        const manager = await FileSystemManager.begin(serialPort, options?.softReboot);
        managerRef.current = manager;

        // Fetch initial device info and filesystem
        const [deviceInfo, files, stats] = await Promise.all([
          manager.getDeviceInfo(),
          manager.walkFs(),
          manager.getFsStats(),
        ]);

        setState((prev) => ({
          ...prev,
          connected: true,
          deviceInfo,
          files,
          stats,
        }));

        return manager;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        setState((prev) => ({ ...prev, error: errorMsg, connected: false }));
        throw error;
      }
    },
    [serialPort]
  );

  /**
   * Disconnect and clean up
   */
  const disconnect = useCallback(async () => {
    if (managerRef.current) {
      await managerRef.current.end();
      managerRef.current = null;
    }
    setState(INITIAL_STATE);
  }, []);

  /**
   * Refresh file tree and stats
   */
  const refresh = useCallback(async () => {
    if (!managerRef.current) {
      throw new Error('File manager not connected');
    }

    try {
      setState((prev) => ({ ...prev, error: null }));

      const [files, stats] = await Promise.all([
        managerRef.current.walkFs(),
        managerRef.current.getFsStats(state.currentPath),
      ]);

      setState((prev) => ({
        ...prev,
        files,
        stats,
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setState((prev) => ({ ...prev, error: errorMsg }));
      throw error;
    }
  }, [state.currentPath]);

  /**
   * Read file from device
   */
  const readFile = useCallback(
    async (filepath: string) => {
      if (!managerRef.current) {
        throw new Error('File manager not connected');
      }

      try {
        setState((prev) => ({
          ...prev,
          operations: [
            ...prev.operations,
            {
              type: 'read',
              filepath,
              progress: 0,
              status: 'in-progress',
            },
          ],
        }));

        const data = await managerRef.current.readFile(filepath);

        setState((prev) => ({
          ...prev,
          operations: prev.operations.map((op) =>
            op.filepath === filepath && op.type === 'read'
              ? { ...op, progress: 100, status: 'success' }
              : op
          ),
        }));

        return data;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        setState((prev) => ({
          ...prev,
          error: errorMsg,
          operations: prev.operations.map((op) =>
            op.filepath === filepath && op.type === 'read'
              ? { ...op, status: 'error', error: errorMsg }
              : op
          ),
        }));
        throw error;
      }
    },
    []
  );

  /**
   * Write file to device
   */
  const writeFile = useCallback(
    async (filepath: string, data: string | Uint8Array, options?: FileManagerOptions) => {
      if (!managerRef.current) {
        throw new Error('File manager not connected');
      }

      try {
        setState((prev) => ({
          ...prev,
          operations: [
            ...prev.operations,
            {
              type: 'write',
              filepath,
              progress: 0,
              status: 'in-progress',
            },
          ],
        }));

        await managerRef.current.writeFile(
          filepath,
          data,
          options?.chunkSize || 128,
          false
        );

        setState((prev) => ({
          ...prev,
          operations: prev.operations.map((op) =>
            op.filepath === filepath && op.type === 'write'
              ? { ...op, progress: 100, status: 'success' }
              : op
          ),
        }));

        // Refresh file tree
        await refresh();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        setState((prev) => ({
          ...prev,
          error: errorMsg,
          operations: prev.operations.map((op) =>
            op.filepath === filepath && op.type === 'write'
              ? { ...op, status: 'error', error: errorMsg }
              : op
          ),
        }));
        throw error;
      }
    },
    [refresh]
  );

  /**
   * Delete file
   */
  const deleteFile = useCallback(
    async (filepath: string) => {
      if (!managerRef.current) {
        throw new Error('File manager not connected');
      }

      try {
        setState((prev) => ({
          ...prev,
          operations: [
            ...prev.operations,
            {
              type: 'delete',
              filepath,
              progress: 0,
              status: 'in-progress',
            },
          ],
        }));

        await managerRef.current.removeFile(filepath);

        setState((prev) => ({
          ...prev,
          operations: prev.operations.map((op) =>
            op.filepath === filepath && op.type === 'delete'
              ? { ...op, progress: 100, status: 'success' }
              : op
          ),
        }));

        // Refresh file tree
        await refresh();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        setState((prev) => ({
          ...prev,
          error: errorMsg,
          operations: prev.operations.map((op) =>
            op.filepath === filepath && op.type === 'delete'
              ? { ...op, status: 'error', error: errorMsg }
              : op
          ),
        }));
        throw error;
      }
    },
    [refresh]
  );

  /**
   * Create directory
   */
  const mkdir = useCallback(
    async (dirpath: string) => {
      if (!managerRef.current) {
        throw new Error('File manager not connected');
      }

      try {
        setState((prev) => ({
          ...prev,
          operations: [
            ...prev.operations,
            {
              type: 'mkdir',
              filepath: dirpath,
              progress: 0,
              status: 'in-progress',
            },
          ],
        }));

        await managerRef.current.makePath(dirpath);

        setState((prev) => ({
          ...prev,
          operations: prev.operations.map((op) =>
            op.filepath === dirpath && op.type === 'mkdir'
              ? { ...op, progress: 100, status: 'success' }
              : op
          ),
        }));

        // Refresh file tree
        await refresh();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        setState((prev) => ({
          ...prev,
          error: errorMsg,
          operations: prev.operations.map((op) =>
            op.filepath === dirpath && op.type === 'mkdir'
              ? { ...op, status: 'error', error: errorMsg }
              : op
          ),
        }));
        throw error;
      }
    },
    [refresh]
  );

  /**
   * List directory contents
   */
  const listDir = useCallback(
    async (dirpath: string = '/') => {
      if (!managerRef.current) {
        throw new Error('File manager not connected');
      }

      try {
        setState((prev) => ({
          ...prev,
          currentPath: dirpath,
          error: null,
        }));

        const files = await managerRef.current.walkFs();
        const stats = await managerRef.current.getFsStats(dirpath);

        setState((prev) => ({
          ...prev,
          files,
          stats,
        }));

        return files;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        setState((prev) => ({ ...prev, error: errorMsg }));
        throw error;
      }
    },
    []
  );

  /**
   * Get filesystem stats
   */
  const getStats = useCallback(
    async (path: string = '/') => {
      if (!managerRef.current) {
        throw new Error('File manager not connected');
      }

      try {
        const stats = await managerRef.current.getFsStats(path);
        setState((prev) => ({ ...prev, stats }));
        return stats;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        setState((prev) => ({ ...prev, error: errorMsg }));
        throw error;
      }
    },
    []
  );

  /**
   * Get device information
   */
  const getDeviceInfo = useCallback(async () => {
    if (!managerRef.current) {
      throw new Error('File manager not connected');
    }

    try {
      const deviceInfo = await managerRef.current.getDeviceInfo();
      setState((prev) => ({ ...prev, deviceInfo }));
      return deviceInfo;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setState((prev) => ({ ...prev, error: errorMsg }));
      throw error;
    }
  }, []);

  /**
   * Clear operations history
   */
  const clearOperations = useCallback(() => {
    setState((prev) => ({ ...prev, operations: [] }));
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (managerRef.current) {
        managerRef.current.end().catch(console.error);
      }
    };
  }, []);

  return {
    state,
    connect,
    disconnect,
    refresh,
    readFile,
    writeFile,
    deleteFile,
    mkdir,
    listDir,
    getStats,
    getDeviceInfo,
    clearOperations,
  };
}
