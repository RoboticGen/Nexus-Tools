/**
 * Event Executor Package
 * Event-driven bridge between the obocar Pyodide worker and the UI
 */

export { EventBus } from "./event-bus";
export type { EventHandler } from "./event-bus";

export { parseStdoutLine, parseStdoutChunk } from "./stream-parser";
export type { ParsedChunk } from "./stream-parser";

export { EXEC_DONE_SENTINEL } from "./protocol";

export { useObocarExecutor } from "./use-obocar-executor";
export type { UseObocarExecutorOptions, UseObocarExecutorResult } from "./types";
