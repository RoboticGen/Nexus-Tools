/**
 * Type definitions for the obocar event contract.
 *
 * These types describe the JSON payloads emitted by the Python `obocar`
 * library (see `apps/obo-playground/public/python/obocar.py`) as
 * `@@EVENT@@{...}` sentinel stdout lines. They are the shared contract
 * between the Python library and `@nexus-tools/event-executor`'s stream
 * parser.
 *
 * The library uses a motor-driver style API: forward()/backward()/
 * left()/right() only prime a speed; sleep(seconds) is what actually runs
 * the primed motion for that duration. car_moved/car_turned events are
 * emitted once that run completes, carrying the speed/duration that
 * produced the resulting distance/degrees.
 */

export interface CarEventBase {
  timestamp: number;
}

export interface CarResetEvent extends CarEventBase {
  type: "reset";
  position: [number, number];
  heading: number;
}

export interface CarMovedEvent extends CarEventBase {
  type: "car_moved";
  direction: "forward" | "backward";
  speed: number;
  duration: number;
  distance: number;
  position: [number, number];
  heading: number;
}

export interface CarTurnedEvent extends CarEventBase {
  type: "car_turned";
  direction: "left" | "right";
  speed: number;
  duration: number;
  degrees: number;
  position: [number, number];
  heading: number;
}

export interface CarStoppedEvent extends CarEventBase {
  type: "stopped";
  position: [number, number];
  heading: number;
}

export interface SensorReadEvent extends CarEventBase {
  type: "sensor_read";
  direction: "front" | "back" | "left" | "right";
  value: number;
}

export interface CarStatusEvent extends CarEventBase {
  type: "status";
  position: [number, number];
  heading: number;
  distance: number;
}

export type CarEvent =
  | CarResetEvent
  | CarMovedEvent
  | CarTurnedEvent
  | CarStoppedEvent
  | SensorReadEvent
  | CarStatusEvent;

/** Sentinel prefix the Python library tags structured events with in stdout. */
export const CAR_EVENT_SENTINEL = "@@EVENT@@";
