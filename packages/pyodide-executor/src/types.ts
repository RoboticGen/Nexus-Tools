/** Type definitions for Pyodide Executor */

/** Message sent to WebWorker */
export interface WorkerMessage {
  command: 'run' | 'input';
  code: string;
}

/** Response from WebWorker */
export interface WorkerResponse {
  responce: 'result' | 'error' | 'request';  // Note: typo preserved for compatibility
  result?: string;
  error?: string;
}

/** Options for usePyodideRunner hook */
export interface UsePyodideRunnerOptions {
  onError?: (error: string) => void;
  onSuccess?: () => void;
  /** Path to the classic worker script. Defaults to `/worker.js`. */
  workerUrl?: string;
}

/** Return type of usePyodideRunner hook. Structurally identical to `@nexus-tools/skulpt-executor`'s `UsePythonRunnerResult` so a consumer can swap Python engines without touching the component that renders the output. */
export interface UsePyodideRunnerResult {
  runCode: (code: string) => Promise<void>;
  stopCode: () => void;
  isRunning: boolean;
  output: string;
  clearOutput: () => void;
}
