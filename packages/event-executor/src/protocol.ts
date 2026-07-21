/**
 * Sentinel emitted by the app-specific worker (see
 * apps/obo-playground/public/worker.js) once `runPython` has returned,
 * regardless of success/error - lets the hook know execution finished
 * since the base worker protocol has no explicit "done" message.
 */
export const EXEC_DONE_SENTINEL = "@@DONE@@";
