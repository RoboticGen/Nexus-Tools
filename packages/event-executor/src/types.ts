import type { CarEvent } from "@nexus-tools/obocar-wrapper";

export interface UseObocarExecutorOptions {
  /** URL of the worker script to load (e.g. '/worker.js'). */
  workerUrl: string | URL;
  onError?: (error: string) => void;
  onEvent?: (event: CarEvent) => void;
}

export interface UseObocarExecutorResult {
  runCode: (code: string) => void;
  stopCode: () => void;
  isRunning: boolean;
  output: string;
  clearOutput: () => void;
  events: CarEvent[];
}
