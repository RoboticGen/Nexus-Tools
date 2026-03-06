/**
 * Pyodide Loader
 * Initialize and manage Python execution environment using WebWorker
 */

import type { WorkerMessage, WorkerResponse } from './types';

export interface PyodideLoaderOptions {
  /** Custom output handler for Python stdout */
  onOutput?: (text: string) => void;
  /** Custom error handler for Python stderr */
  onError?: (error: string) => void;
  /** Custom input request handler */
  onInputRequest?: () => Promise<string | null>;
}

export class PyodideLoader {
  private worker: Worker | null = null;
  private options: PyodideLoaderOptions;

  constructor(options: PyodideLoaderOptions = {}) {
    this.options = options;
  }

  /**
   * Initialize the WebWorker
   * @param workerUrl URL to the worker.js file
   */
  public initializeWorker(workerUrl: string | URL): Worker {
    if (this.worker) {
      return this.worker;
    }

    this.worker = new Worker(workerUrl);

    this.worker.onerror = (event: ErrorEvent) => {
      console.error("Worker error:", event.message);
      this.options.onError?.(event.message);
    };

    this.worker.onmessage = async (event: MessageEvent<WorkerResponse>) => {
      console.log("Worker message received:", event.data);
      const { responce, result, error } = event.data;

      if (responce === 'result' && result !== undefined) {
        this.options.onOutput?.(result);
      } else if (responce === 'request') {
        const input = await this.options.onInputRequest?.();
        if (input && this.worker) {
          this.sendMessage({ command: 'input', code: input });
        }
      } else if (responce === 'error') {
        this.options.onError?.(error || 'Unknown error');
      }
    };

    return this.worker;
  }

  /**
   * Send a message to the worker
   */
  public sendMessage(message: WorkerMessage): void {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }
    this.worker.postMessage(message);
  }

  /**
   * Run Python code
   */
  public runCode(code: string): void {
    this.sendMessage({ command: 'run', code });
  }

  /**
   * Send input to Python stdin
   */
  public sendInput(input: string): void {
    this.sendMessage({ command: 'input', code: input });
  }

  /**
   * Terminate the worker
   */
  public terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  /**
   * Stop execution and restart worker
   */
  public stopAndRestart(workerUrl: string | URL): void {
    this.terminate();
    this.initializeWorker(workerUrl);
  }

  /**
   * Get the current worker instance
   */
  public getWorker(): Worker | null {
    return this.worker;
  }
}

/**
 * Create a simple loader instance with default terminal-based output
 */
export function createTerminalLoader(terminalId: string = 'terminal-output'): PyodideLoader {
  const getTerminal = (): HTMLTextAreaElement | null => {
    if (typeof window !== 'undefined') {
      return document.getElementById(terminalId) as HTMLTextAreaElement;
    }
    return null;
  };

  const appendToTerminal = (text: string) => {
    const terminal = getTerminal();
    if (terminal) {
      terminal.value += text + '\n';
      terminal.scrollTop = terminal.scrollHeight;
    }
  };

  return new PyodideLoader({
    onOutput: appendToTerminal,
    onError: (error) => appendToTerminal("Error: " + error),
    onInputRequest: async () => {
      return prompt('Enter the input');
    },
  });
}
