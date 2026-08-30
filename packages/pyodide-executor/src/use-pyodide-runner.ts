/** React Hook for Pyodide Python Execution */

"use client";

import { useState, useCallback, useRef, useEffect } from "react";

import { PyodideLoader } from "./loader";

import type { UsePyodideRunnerOptions, UsePyodideRunnerResult } from "./types";

const BANNER = "Python 3.10 \n>>> ";

/** Runs Python in the Pyodide worker and exposes its output as React state. This exists because `createTerminalLoader` — the only way to drive this package before — takes a DOM element id and appends output straight to `document.getElementById(id).value`. */
export function usePyodideRunner(
  options: UsePyodideRunnerOptions = {}
): UsePyodideRunnerResult {
  const { onError, onSuccess, workerUrl = "/worker.js" } = options;
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState(BANNER);
  const loaderRef = useRef<PyodideLoader | null>(null);

  // The worker's callbacks fire outside React's knowledge, so they're read through refs — re-creating the worker whenever a caller passes a new inline `onError` would tear down a running program.
  const onErrorRef = useRef(onError);
  const onSuccessRef = useRef(onSuccess);
  onErrorRef.current = onError;
  onSuccessRef.current = onSuccess;

  const append = useCallback((text: string) => {
    setOutput((prev) => prev + text + "\n");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || loaderRef.current) return;

    const loader = new PyodideLoader({
      onOutput: (text) => {
        append(text);
        // A result message is the worker signalling the program finished; the post-run state belongs to the caller, not to this stream.
        setIsRunning(false);
        onSuccessRef.current?.();
      },
      onError: (error) => {
        append(`Error: ${error}`);
        setIsRunning(false);
        onErrorRef.current?.(error);
      },
      onInputRequest: async () => window.prompt("Enter the input"),
    });

    // A string URL, not `new URL(...)`: the worker uses `importScripts` to pull Pyodide in, which only classic (non-module) workers support.
    loader.initializeWorker(workerUrl);
    loaderRef.current = loader;

    return () => {
      loader.terminate();
      loaderRef.current = null;
    };
  }, [append, workerUrl]);

  const runCode = useCallback(
    async (code: string) => {
      const loader = loaderRef.current;
      if (!loader) {
        onErrorRef.current?.("Python environment is still loading. Please wait...");
        return;
      }

      setIsRunning(true);
      setOutput(BANNER);
      loader.runCode(code);
    },
    []
  );

  const stopCode = useCallback(() => {
    const loader = loaderRef.current;
    if (!loader) return;

    // Pyodide runs synchronously inside the worker, so there is no cooperative interrupt to send — killing and rebuilding the worker is the only stop.
    loader.stopAndRestart(workerUrl);
    setIsRunning(false);
    setOutput(BANNER);
  }, [workerUrl]);

  const clearOutput = useCallback(() => {
    setOutput(BANNER);
  }, []);

  return { runCode, stopCode, isRunning, output, clearOutput };
}
