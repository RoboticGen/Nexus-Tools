/**
 * Pyodide WebWorker for Python Execution - OBO Playground
 *
 * Based on @nexus-tools/pyodide-executor's base worker, extended to:
 *  - preload the obocar library into Pyodide's virtual filesystem so user
 *    code can `from obocar import OboCar`
 *  - emit an "@@DONE@@" sentinel once execution finishes (success or error)
 *    so the UI knows the run has completed
 *  - batch stdout/stderr into one postMessage roughly every FLUSH_INTERVAL_MS
 *    instead of one per line. An unthrottled loop (no sleep()) can otherwise
 *    print far faster than the main thread can dispatch individual worker
 *    messages, backing up its task queue badly enough that even the Stop
 *    button's click stops getting a turn.
 *
 *    This has to be a synchronous check against Date.now() rather than a
 *    real setInterval timer - `pyodide.runPython(code)` runs a Python
 *    `while True` loop as one single synchronous JS call that never
 *    returns control to this worker's own event loop, so a timer-based
 *    flush would simply never fire until the loop ends (i.e. never).
 *    Checking elapsed wall-clock time inside the stdout callback itself
 *    doesn't have that problem, and as a side benefit it flushes
 *    immediately on the first print after a real time.sleep() call (since
 *    that easily exceeds the interval), so code paced with obocar's
 *    sleep() still streams live rather than only flushing at the end.
 *    A size-based safety cap guards against a single flush becoming
 *    pathologically large during a very tight unthrottled loop.
 *    Any lines still buffered when Stop terminates the worker are
 *    discarded along with the rest of that worker's state - an acceptable
 *    trade-off for keeping the UI responsive against a runaway loop.
 */

// Worker state
let isready = false;
let pyodide = null;
let buffer = [];

const EXEC_DONE_SENTINEL = "@@DONE@@";
const FLUSH_INTERVAL_MS = 50;
const FLUSH_MAX_BUFFER_SIZE = 500;

let stdoutQueue = [];
let stderrQueue = [];
let lastFlushAt = 0;

function flushOutput() {
  if (stdoutQueue.length > 0) {
    self.postMessage({ responce: "result", result: stdoutQueue.join("\n") });
    stdoutQueue = [];
  }
  if (stderrQueue.length > 0) {
    self.postMessage({ responce: "error", error: stderrQueue.join("\n") });
    stderrQueue = [];
  }
  lastFlushAt = Date.now();
}

function maybeFlushOutput() {
  if (Date.now() - lastFlushAt >= FLUSH_INTERVAL_MS || stdoutQueue.length >= FLUSH_MAX_BUFFER_SIZE) {
    flushOutput();
  }
}

// Import Pyodide in worker context
importScripts('https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js');

async function initPyodide() {
  pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/' });
  pyodide.setStdout({ batched: (x) => stdoutHandler(x) });
  pyodide.setStderr({ batched: (x) => stderrHandler(x) });
  pyodide.setStdin({ error: true });

  const response = await fetch('/python/obocar.py');
  const obocarSource = await response.text();
  pyodide.FS.writeFile('obocar.py', obocarSource);
}

initPyodide().then(() => {
  isready = true;
  self.postMessage({ responce: "result", result: 'Python 3.10 (obocar ready)' });
});

function getSyntaxError(message) {
  const syntaxErrorIndex = message.indexOf('Error');
  if (syntaxErrorIndex !== -1) {
    return message.substring(syntaxErrorIndex);
  } else {
    return 'Unknown error occurred. Please check your code and try again.';
  }
}

function stdoutHandler(x) {
  stdoutQueue.push(x);
  maybeFlushOutput();
}

function stderrHandler(x) {
  stderrQueue.push(x);
  flushOutput();
}

function codeRunner(code) {
  try {
    pyodide.runPython(code);
  } catch (err) {
    const error = getSyntaxError(err.message);
    self.postMessage({ responce: "error", error: error });
  } finally {
    flushOutput();
    self.postMessage({ responce: "result", result: EXEC_DONE_SENTINEL });
  }
}

self.onmessage = async function (event) {
  if (!isready) {
    await initPyodide();
    isready = true;
  }
  const command = event.data.command;
  if (command === 'run') {
    const code = event.data.code;
    try {
      codeRunner(code);
    } catch (err) {
      self.postMessage({ responce: "error", error: err.message });
      self.postMessage({ responce: "result", result: EXEC_DONE_SENTINEL });
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
