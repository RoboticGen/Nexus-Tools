/**
 * Pyodide WebWorker for Python Execution
 * This file should be copied to the app's public directory as worker.js
 */

// Worker state
let isready = false;
let pyodide: any = null;
let buffer: number[] = [];

// Import Pyodide in worker context
// @ts-ignore
importScripts('https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js');

async function initPyodide() {
  // @ts-ignore
  pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/' });
  pyodide.setStdout({ batched: (x: string) => stdoutHandler(x) });
  pyodide.setStderr({ batched: (x: string) => stderrHandler(x) });
  pyodide.setStdin({ error: true });
}

initPyodide().then(() => {
  isready = true;
  self.postMessage({ responce: "result", result: 'Python 3.10' });
});

function getSyntaxError(message: string): string {
  const syntaxErrorIndex = message.indexOf('Error');
  if (syntaxErrorIndex !== -1) {
    return message.substring(syntaxErrorIndex);
  } else {
    return 'Unknown error occurred. Please check your code and try again.';
  }
}

function stdoutHandler(x: string) {
  self.postMessage({ responce: "result", result: x });
}

function stderrHandler(x: string) {
  self.postMessage({ responce: "error", error: x });
  console.log(x);
}

function codeRunner(code: string) {
  if (!isready) {
    initPyodide();
    isready = true;
  }
  try {
    pyodide.runPython(code);
  } catch (err: any) {
    console.log(err.message);
    const error = getSyntaxError(err.message);
    console.log(error);
    self.postMessage({ responce: "error", error: error });
  }
}

self.onmessage = async function (event: MessageEvent) {
  if (!isready) {
    await initPyodide();
    isready = true;
  }
  const command = event.data.command;
  if (command === 'run') {
    const code = event.data.code;
    try {
      codeRunner(code);
      return;
    } catch (err: any) {
      self.postMessage({ responce: "error", error: err.message });
    }
  } else if (command === 'input') {
    const code = event.data.code;
    for (let i = 0; i < code.length; i++) {
      buffer.push(code.charCodeAt(i));
    }
  } else {
    console.error('Unknown command:', command);
  }
};

self.onerror = function (event) {
  console.error(event.message || event);
};
