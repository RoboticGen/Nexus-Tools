import { useState, useCallback, useRef } from "react";

import { BOARD_WAS_RESET, serialStreamManager } from "../utils/serial-stream-manager";

const OUTPUT_LIMIT = 20000;

export type ESP32RunOutcome = "finished" | "error" | "stopped";

/** Runs code on the board and collects its output; `showing` says whether the output view should show this instead of the browser run's. */
export function useESP32Runner() {
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [showing, setShowing] = useState(false);
  // Starting a run stops the previous one; its late result must not land in the new run's output.
  const runIdRef = useRef(0);

  const run = useCallback(async (code: string): Promise<ESP32RunOutcome> => {
    const id = ++runIdRef.current;
    const append = (text: string) => {
      if (runIdRef.current !== id) return;
      setOutput((prev) => (prev + text.replace(/\r\n/g, "\n")).slice(-OUTPUT_LIMIT));
    };
    const finish = (text: string) => {
      if (runIdRef.current !== id) return;
      setOutput((prev) => (prev.endsWith("\n") ? prev : prev + "\n") + text.replace(/\r\n/g, "\n").trimEnd() + "\n");
    };

    setShowing(true);
    setIsRunning(true);
    setOutput("--- Running on ESP32 ---\n");
    try {
      const { error } = await serialStreamManager.runCode(code, append);
      const outcome: ESP32RunOutcome = !error ? "finished" : error.includes("KeyboardInterrupt") ? "stopped" : "error";
      if (outcome === "error") finish(`${error.trimEnd()}\n--- Error ---`);
      else if (error === BOARD_WAS_RESET) finish("The program ignored Stop, so the board was reset.\n--- Stopped ---");
      else finish(`--- ${outcome === "stopped" ? "Stopped" : "Finished"} ---`);
      return outcome;
    } catch (err) {
      finish(`${err instanceof Error ? err.message : String(err)}\n--- Error ---`);
      return "error";
    } finally {
      if (runIdRef.current === id) setIsRunning(false);
    }
  }, []);

  const stop = useCallback(() => serialStreamManager.interrupt(), []);
  const clear = useCallback(() => setOutput(""), []);
  const hide = useCallback(() => setShowing(false), []);

  return { output, isRunning, showing, run, stop, clear, hide };
}
