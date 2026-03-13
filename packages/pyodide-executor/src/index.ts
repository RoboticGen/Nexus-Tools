/**
 * Pyodide Executor Package
 * WebWorker-based Python execution using Pyodide
 * 
 * Usage:
 * 1. Copy worker.ts content to your app's public/worker.js
 * 2. Use PyodideLoader to initialize and communicate with the worker
 */

// Core loader and worker management
export { PyodideLoader, createTerminalLoader, type PyodideLoaderOptions } from './loader';

// Type definitions
export type { WorkerMessage, WorkerResponse } from './types';
