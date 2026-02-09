"use client";

import { useState, useCallback, useRef, useEffect } from "react";

declare global {
  interface Window {
    Sk: typeof Sk;
  }
  const Sk: {
    configure: (options: {
      output: (text: string) => void;
      read: (filename: string) => string;
    }) => void;
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
  };
}

interface UsePythonRunnerOptions {
  onError?: (error: string) => void;
  onSuccess?: () => void;
}

export function usePythonRunner(options: UsePythonRunnerOptions = {}) {
  const { onError, onSuccess } = options;
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState("Python 3.10 \n>>> ");
  const stopExecutionRef = useRef(false);
  const skulptLoadedRef = useRef(false);

  // Load Skulpt library
  useEffect(() => {
    if (skulptLoadedRef.current) return;

    const loadSkulpt = async () => {
      // Load main Skulpt library
      const skulptScript = document.createElement("script");
      skulptScript.src = "https://skulpt.org/js/skulpt.min.js";
      skulptScript.async = true;

      skulptScript.onload = () => {
        // Load Skulpt stdlib
        const stdlibScript = document.createElement("script");
        stdlibScript.src = "https://skulpt.org/js/skulpt-stdlib.js";
        stdlibScript.async = true;

        stdlibScript.onload = () => {
          skulptLoadedRef.current = true;
          configureSkulpt();
        };

        document.body.appendChild(stdlibScript);
      };

      document.body.appendChild(skulptScript);
    };

    const configureSkulpt = () => {
      if (typeof Sk === "undefined") return;

      Sk.configure({
        output: (text: string) => {
          setOutput((prev) => prev + text);
        },
        read: (filename: string) => {
          if (
            Sk.builtinFiles === undefined ||
            Sk.builtinFiles.files[filename] === undefined
          ) {
            throw new Error(`File not found: '${filename}'`);
          }
          return Sk.builtinFiles.files[filename];
        },
      });

      // Configure turtle graphics target
      if (!Sk.TurtleGraphics) {
        (Sk as { TurtleGraphics: { target: string } }).TurtleGraphics = {
          target: "turtle-canvas",
        };
      } else {
        Sk.TurtleGraphics.target = "turtle-canvas";
      }
    };

    loadSkulpt();
  }, []);

  const runCode = useCallback(
    async (code: string) => {
      if (!skulptLoadedRef.current || typeof Sk === "undefined") {
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
