"use client";

import { PyodideLoader } from "@nexus-tools/pyodide-executor";
import { useCallback, useEffect, useRef, useState } from "react";

import { EXEC_DONE_SENTINEL } from "./protocol";
import { EventBus } from "./event-bus";
import { parseStdoutChunk } from "./stream-parser";

import type { CarEvent } from "@nexus-tools/obocar-wrapper";
import type { UseObocarExecutorOptions, UseObocarExecutorResult } from "./types";

/**
 * An unthrottled Python loop (e.g. `while True: car.forward(1)` with no
 * `wait()`/`sleep()`) can emit output far faster than React can re-render.
 * Buffering lines and flushing at most once per animation frame keeps the
 * main thread responsive - without it, a runaway loop can make even the
 * Stop button unresponsive since every single line would otherwise trigger
 * its own state update and re-render.
 */
const MAX_OUTPUT_LINES = 2000;
const MAX_EVENTS = 2000;

/**
 * Wires @nexus-tools/pyodide-executor's worker loader to the obocar event
 * stream parser and event bus, exposing the same shape as skulpt-executor's
 * usePythonRunner for API consistency across the obo-* apps.
 */
export function useObocarExecutor(options: UseObocarExecutorOptions): UseObocarExecutorResult {
  const { workerUrl, onError, onEvent } = options;

  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [events, setEvents] = useState<CarEvent[]>([]);

  const loaderRef = useRef<PyodideLoader | null>(null);
  const busRef = useRef(new EventBus<CarEvent>());

  const pendingLinesRef = useRef<string[]>([]);
  const pendingEventsRef = useRef<CarEvent[]>([]);
  const flushHandleRef = useRef<number | null>(null);

  const scheduleFlush = useCallback(() => {
    if (flushHandleRef.current !== null) return;
    flushHandleRef.current = requestAnimationFrame(() => {
      flushHandleRef.current = null;

      if (pendingLinesRef.current.length > 0) {
        const lines = pendingLinesRef.current;
        pendingLinesRef.current = [];
        setOutput((prev) => {
          const combined = prev ? prev.split("\n").concat(lines) : lines;
          return combined.slice(-MAX_OUTPUT_LINES).join("\n");
        });
      }

      if (pendingEventsRef.current.length > 0) {
        const newEvents = pendingEventsRef.current;
        pendingEventsRef.current = [];
        setEvents((prev) => [...prev, ...newEvents].slice(-MAX_EVENTS));
      }
    });
  }, []);

  useEffect(() => {
    const bus = busRef.current;
    const handleEvent = (event: CarEvent) => {
      pendingEventsRef.current.push(event);
      scheduleFlush();
      onEvent?.(event);
    };
    bus.onAny(handleEvent);

    const loader = new PyodideLoader({
      onOutput: (text) => {
        for (const chunk of parseStdoutChunk(text)) {
          if (chunk.event) {
            bus.emit(chunk.event);
          } else if (chunk.text === EXEC_DONE_SENTINEL) {
            setIsRunning(false);
          } else if (chunk.text !== null && chunk.text !== "") {
            pendingLinesRef.current.push(chunk.text);
            scheduleFlush();
          }
        }
      },
      onError: (error) => {
        pendingLinesRef.current.push(`Error: ${error}`);
        scheduleFlush();
        setIsRunning(false);
        onError?.(error);
      },
    });
    loader.initializeWorker(workerUrl);
    loaderRef.current = loader;

    return () => {
      if (flushHandleRef.current !== null) {
        cancelAnimationFrame(flushHandleRef.current);
        flushHandleRef.current = null;
      }
      loader.terminate();
      loaderRef.current = null;
      bus.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerUrl, scheduleFlush]);

  const runCode = useCallback((code: string) => {
    if (!loaderRef.current) return;
    setIsRunning(true);
    loaderRef.current.runCode(code);
  }, []);

  const stopCode = useCallback(() => {
    pendingLinesRef.current = [];
    pendingEventsRef.current = [];
    loaderRef.current?.stopAndRestart(workerUrl);
    setIsRunning(false);
  }, [workerUrl]);

  const clearOutput = useCallback(() => {
    pendingLinesRef.current = [];
    pendingEventsRef.current = [];
    setOutput("");
    setEvents([]);
  }, []);

  return { runCode, stopCode, isRunning, output, clearOutput, events };
}
