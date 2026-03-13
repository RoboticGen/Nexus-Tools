/**
 * Type definitions for Skulpt Executor
 */

/**
 * Skulpt global interface
 */
export interface SkulptAPI {
  configure: (options: SkulptConfigureOptions) => void;
  TurtleGraphics: {
    target: string;
  };
  misceval: {
    asyncToPromise: (
      fn: () => unknown,
      options?: { "*": () => void }
    ) => Promise<unknown>;
  };
  importMainWithBody: (
    name: string,
    dumpJS: boolean,
    body: string,
    canSuspend: boolean
  ) => unknown;
  builtinFiles?: {
    files: Record<string, string>;
  };
}

/**
 * Skulpt configuration options
 */
export interface SkulptConfigureOptions {
  output: (text: string) => void;
  read: (filename: string) => string;
  __future__?: any;
  execLimit?: number;
  yieldLimit?: number | null;
  killableWhile?: boolean;
  killableFor?: boolean;
}

/**
 * Options for usePythonRunner hook
 */
export interface UsePythonRunnerOptions {
  onError?: (error: string) => void;
  onSuccess?: () => void;
  turtleCanvasId?: string;
}

/**
 * Return type of usePythonRunner hook
 */
export interface UsePythonRunnerResult {
  runCode: (code: string) => Promise<void>;
  stopCode: () => void;
  isRunning: boolean;
  output: string;
  clearOutput: () => void;
}
