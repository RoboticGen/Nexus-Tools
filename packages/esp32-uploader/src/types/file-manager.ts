/**
 * File Manager types and interfaces
 */

export interface FileOperation {
  type: 'read' | 'write' | 'delete' | 'list' | 'mkdir' | 'stat';
  filepath: string;
  progress: number;
  total?: number;
  status: 'idle' | 'in-progress' | 'success' | 'error';
  error?: string;
}

export interface FileManagerState {
  connected: boolean;
  currentPath: string;
  files: FileSystemNode[];
  stats: FileSystemStats | null;
  deviceInfo: DeviceInfo | null;
  operations: FileOperation[];
  error: string | null;
}

export interface FileSystemNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  content?: FileSystemNode[];
}

export interface FileSystemStats {
  used: number;
  free: number;
  total: number;
}

export interface DeviceInfo {
  machine: string;
  release: string;
  sysname: string;
  version: string;
  mpy_arch: string | null;
  mpy_ver: string | number;
  mpy_sub: number;
  sys_path: string[];
}

export interface FileManagerOptions {
  chunkSize?: number;
  timeout?: number;
  softReboot?: boolean;
}

export interface FileTransferProgress {
  current: number;
  total: number;
  percentage: number;
  speed?: number; // bytes per second
}
