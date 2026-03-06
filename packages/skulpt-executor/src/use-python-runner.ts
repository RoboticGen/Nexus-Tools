/**
 * React Hook for Skulpt Python Execution
 */

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { loadSkulptLibrary, configureSkulpt, configureTurtleGraphics, getSkulpt } from './loader';
import type { UsePythonRunnerOptions, UsePythonRunnerResult } from './types';

export function usePythonRunner(options: UsePythonRunnerOptions = {}): UsePythonRunnerResult {
  const { onError, onSuccess, turtleCanvasId = 'turtle-canvas' } = options;
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState("Python 3.10 \n>>> ");
  const stopExecutionRef = useRef(false);
  const skulptLoadedRef = useRef(false);

  // Load Skulpt library
  useEffect(() => {
    if (skulptLoadedRef.current) return;

    const initializeSkulpt = async () => {
      try {
        await loadSkulptLibrary();
        skulptLoadedRef.current = true;
        
        // Configure Skulpt
        configureSkulpt({
          output: (text: string) => {
            setOutput((prev) => prev + text);
          },
          read: (filename: string) => {
            const Sk = getSkulpt();
            if (
              !Sk ||
              Sk.builtinFiles === undefined ||
              Sk.builtinFiles.files[filename] === undefined
            ) {
              throw new Error(`File not found: '${filename}'`);
            }
            return Sk.builtinFiles.files[filename];
          },
        });

        // Configure turtle graphics
        configureTurtleGraphics(turtleCanvasId);
      } catch (err) {
        console.error('Failed to initialize Skulpt:', err);
        onError?.('Failed to load Python environment');
      }
    };

    initializeSkulpt();
  }, [onError, turtleCanvasId]);

  const runCode = useCallback(
    async (code: string) => {
      const Sk = getSkulpt();
      if (!skulptLoadedRef.current || !Sk) {
        onError?.("Skulpt is still loading. Please wait...");
        return;
      }

      setIsRunning(true);
      stopExecutionRef.current = false;
      setOutput("Python 3.10 \n>>> ");

      try {
        await Sk.misceval.asyncToPromise(
          () => Sk.importMainWithBody("<stdin>", false, code, true),
          {
            "*": () => {
              if (stopExecutionRef.current) {
                throw new Error("Execution interrupted");
              }
            },
          }
        );
        onSuccess?.();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (errorMsg === "Execution interrupted") {
          stopExecutionRef.current = false;
        } else {
          onError?.(errorMsg);
          setOutput((prev) => prev + `\nError: ${errorMsg}\n>>> `);
        }
      } finally {
        setIsRunning(false);
      }
    },
    [onError, onSuccess]
  );

  const stopCode = useCallback(() => {
    stopExecutionRef.current = true;
  }, []);

  const clearOutput = useCallback(() => {
    setOutput("Python 3.10 \n>>> ");
  }, []);

  return {
    runCode,
    stopCode,
    isRunning,
    output,
    clearOutput,
  };
}
