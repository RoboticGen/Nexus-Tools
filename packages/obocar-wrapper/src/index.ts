/**
 * OboCar Wrapper Package
 * Event contract for the OBO Playground's Python car library.
 *
 * The canonical Python source lives at
 * `apps/obo-playground/public/python/obocar.py` (served statically and
 * fetched by the Pyodide worker at init) rather than being embedded here -
 * a plain .py file is easier to author/read than a JS template literal,
 * and avoids needing bundler config to get raw text into an unbundled
 * worker script. This package holds the TS-side event contract that
 * mirrors what that Python library emits.
 */

export { CAR_EVENT_SENTINEL } from "./types";
export type {
  CarEvent,
  CarEventBase,
  CarResetEvent,
  CarMovedEvent,
  CarTurnedEvent,
  CarStoppedEvent,
  SensorReadEvent,
  CarStatusEvent,
  CollisionEvent,
} from "./types";
