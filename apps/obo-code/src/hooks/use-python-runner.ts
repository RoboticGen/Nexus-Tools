"use client";

import { useState, useCallback, useRef, useEffect } from "react";

declare global {
  interface Window {
    __BRYTHON__?: {
      run_script?: (
        script: HTMLScriptElement,
        src: string,
        name: string,
        url: string,
        runLoop: boolean
      ) => void;
      imported?: Record<string, unknown>;
    };
    brython?: (options?: Record<string, unknown>) => void;
    __brython_runner_output__: (text: string) => void;
  }
}

interface UsePythonRunnerOptions {
  onError?: (error: string) => void;
  onSuccess?: () => void;
}

export function usePythonRunner(options: UsePythonRunnerOptions = {}) {
  const { onError, onSuccess } = options;
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [output, setOutput] = useState("Python \n>>> ");
  const stopExecutionRef = useRef(false);
  const brythonLoadedRef = useRef(false);
  const outputRef = useRef(setOutput);

  // Keep outputRef in sync
  useEffect(() => {
    outputRef.current = setOutput;
  }, []);

  // Load Brython library
  useEffect(() => {
    if (brythonLoadedRef.current) return;

    const loadBrython = () => {
      // If a previous navigation already loaded Brython, just mark as ready.
      if (typeof window !== "undefined" && window.__BRYTHON__ && typeof window.brython === "function") {
        brythonLoadedRef.current = true;
        setIsLoading(false);
        return;
      }

      // Load main Brython library
      const brythonScript = document.createElement("script");
      brythonScript.src = "https://cdn.jsdelivr.net/npm/brython@3.13.0/brython.min.js";
      brythonScript.async = true;

      brythonScript.onload = () => {
        // Load Brython stdlib
        const stdlibScript = document.createElement("script");
        stdlibScript.src = "https://cdn.jsdelivr.net/npm/brython@3.13.0/brython_stdlib.js";
        stdlibScript.async = true;

        stdlibScript.onload = () => {
          // Initialize Brython exactly once.
          try {
            if (typeof window.brython === "function") {
              window.brython({ debug: 1 });
            }
            brythonLoadedRef.current = true;
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            onError?.(`Failed to initialize Brython: ${errorMsg}`);
          }
          setIsLoading(false);
        };

        stdlibScript.onerror = () => {
          onError?.("Failed to load Brython standard library");
          setIsLoading(false);
        };

        document.head.appendChild(stdlibScript);
      };

      brythonScript.onerror = () => {
        onError?.("Failed to load Brython");
        setIsLoading(false);
      };

      document.head.appendChild(brythonScript);
    };

    loadBrython();
  }, [onError]);

  const runCode = useCallback(
    (code: string) => {
      const $B = window.__BRYTHON__;
      if (!brythonLoadedRef.current || !$B || typeof $B.run_script !== "function") {
        onError?.("Brython is still loading. Please wait...");
        return;
      }

      setIsRunning(true);
      stopExecutionRef.current = false;
      setOutput("Python \n>>> ");

      try {
        // Clear previous turtle rendering (Brython turtle uses SVG; other libs may use canvas)
        const turtleCanvas = document.getElementById("turtle-canvas");
        if (turtleCanvas) {
          const svgEls = turtleCanvas.getElementsByTagName("svg");
          while (svgEls.length > 0) {
            svgEls[0].remove();
          }
          const canvasEls = turtleCanvas.getElementsByTagName("canvas");
          while (canvasEls.length > 0) {
            canvasEls[0].remove();
          }
        }

        // Create a hidden script element with the user's Python code
        // We wrap the code to capture stdout/stderr
        const normalizedUserCode = code.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        const indentedUserCode = normalizedUserCode
          .split("\n")
          .map((line) => `    ${line}`)
          .join("\n");

        const wrappedCode = [
          "import sys",
          "from browser import document",
          "",
          "_obo_turtle_available = False",
          "",
          "class _OutputWriter:",
          "    def __init__(self, is_error=False):",
          "        self.is_error = is_error",
          "    def write(self, text):",
          "        if text:",
          "            from browser import window",
          "            if hasattr(window, '__brython_runner_output__'):",
          "                window.__brython_runner_output__(text)",
          "    def flush(self):",
          "        pass",
          "",
          "sys.stdout = _OutputWriter()",
          "sys.stderr = _OutputWriter(is_error=True)",
          "",
          "# If the user uses turtle, make it render inside our panel.",
          "try:",
          "    _wrapper = document['turtle-canvas']",
          "    import turtle as _turtle",
          "    _obo_turtle_available = True",
          "    # Match the turtle SVG size to the visible workspace so the origin (0,0) is centered.",
          "    _w = int(getattr(_wrapper, 'clientWidth', 0) or 0)",
          "    _h = int(getattr(_wrapper, 'clientHeight', 0) or 0)",
          "    if _w < 50:",
          "        _w = 500",
          "    if _h < 50:",
          "        _h = 500",
          "    _turtle.set_defaults(",
          "        turtle_canvas_wrapper=_wrapper,",
          "        # Avoid ID collision with the existing div#turtle-canvas",
          "        turtle_canvas_id='obo-turtle-canvas',",
          "        canvwidth=_w,",
          "        canvheight=_h,",
          "        mode='standard',",
          "    )",
          "except Exception:",
          "    import traceback",
          "    traceback.print_exc()",
          "",
          "try:",
          indentedUserCode,
          "except Exception:",
          "    import traceback",
          "    traceback.print_exc()",
          "",
          "# Ensure any turtle drawing is actually mounted into the DOM.",
          "if _obo_turtle_available:",
          "    try:",
          "        _turtle.done()",
          "    except Exception:",
          "        pass",
          "",
        ].join("\n");

        // Set up the output callback on window
        window.__brython_runner_output__ = (text: string) => {
          outputRef.current((prev) => prev + text);
        };

        // Create a detached script element. Do NOT append to DOM: Brython sets a
        // MutationObserver that auto-runs newly added <script type="text/python">,
        // and it also enforces globally unique script ids.
        const scriptEl = document.createElement("script");
        scriptEl.type = "text/python";
        scriptEl.textContent = wrappedCode;

        // Reset previous module state (best-effort) and execute this script.
        const moduleName = "__obo_code__";
        try {
          if (window.__BRYTHON__?.imported && window.__BRYTHON__.imported[moduleName]) {
            delete window.__BRYTHON__.imported[moduleName];
          }
        } catch {
          // ignore
        }

        const url = window.location.href.split("#")[0];
        $B.run_script(scriptEl, wrappedCode, moduleName, url, true);

        onSuccess?.();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        onError?.(errorMsg);
        setOutput((prev) => prev + `\nError: ${errorMsg}\n>>> `);
      } finally {
        setIsRunning(false);
      }
    },
    [onError, onSuccess]
  );

  const stopCode = useCallback(() => {
    stopExecutionRef.current = true;
    setIsRunning(false);
  }, []);

  const clearOutput = useCallback(() => {
    setOutput("Python \n>>> ");
  }, []);

  return {
    runCode,
    stopCode,
    isRunning,
    isLoading,
    output,
    clearOutput,
  };
}
