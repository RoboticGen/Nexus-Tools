/**
 * Type definitions for Pyodide Executor
 */

/**
 * Message sent to WebWorker
 */
export interface WorkerMessage {
  command: 'run' | 'input';
  code: string;
}

/**
 * Response from WebWorker
 */
export interface WorkerResponse {
  responce: 'result' | 'error' | 'request';  // Note: typo preserved for compatibility
  result?: string;
  error?: string;
}
