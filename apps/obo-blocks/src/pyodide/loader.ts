/**
 * Pyodide Loader for obo-blocks
 * Uses @nexus-tools/pyodide-executor package
 */

import { createTerminalLoader } from '@nexus-tools/pyodide-executor';

let loaderInstance: ReturnType<typeof createTerminalLoader> | null = null;

function getLoader() {
  if (!loaderInstance && typeof window !== 'undefined') {
    loaderInstance = createTerminalLoader('terminal-output');
    // Use string path for classic worker (importScripts requires classic worker)
    loaderInstance.initializeWorker('/worker.js');
  }
  return loaderInstance;
}

export function stopWorker(): void {
  const loader = getLoader();
  if (!loader) return;

  if (confirm('Do you want to stop the code ?')) {
    loader.stopAndRestart('/worker.js');
    
    const terminal = document.getElementById('terminal-output') as HTMLTextAreaElement;
    if (terminal) {
      terminal.value = 'Python 3.10 \n>>> ';
    }
  }
}

export function getWorker(): Worker | null {
  const loader = getLoader();
  return loader?.getWorker() || null;
}

export function getTerminal(): HTMLTextAreaElement | null {
  if (typeof window !== 'undefined') {
    return document.getElementById('terminal-output') as HTMLTextAreaElement;
  }
  return null;
}
