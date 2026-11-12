// Runs a student's Python program, written against the real car's SDK (`from obocar import OBOCar`,
// github.com/RoboticGen/obo-car-sdk), in lockstep with the sim: Skulpt pauses the program at every
// time.sleep() and every pass of a while loop, and the sim resumes it on its fixed 16 ms control tick.

import type { RobotApi } from "./playground-sim";

/* eslint-disable @typescript-eslint/no-explicit-any -- Skulpt is untyped JavaScript */
export type Skulpt = any;
type PyObject = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

const SLEEP = "obo.sleep";
const HALF_TICK_MS = 8; // sleeps round to the nearest 16 ms control tick
// The IR panel reads 0-4095: high over white floor, low over the black line.
const IR_WHITE = 3600;
const IR_BLACK = 400;
const MAX_OUTPUT = 20_000;

// Mirrors obocar.py's OBOCar: same names, defaults and 0-512 speed clamp. Only the hardware calls differ.
const OBOCAR_PY = `
import _robot
import time

class OBOCar:
    MAX_SPEED = 512

    def __init__(self, pins=None):
        self._left = 0
        self._right = 0
        self.ir_threshold = {ch: 2048 for ch in range(1, 7)}
        self.stop()

    def _clamp(self, speed):
        if speed is None:
            return self.MAX_SPEED
        if not isinstance(speed, int):
            raise TypeError("can't convert float to int")  # what PWM.duty() raises on the car
        return max(0, min(self.MAX_SPEED, speed))

    def _pair(self, speed, speed_left, speed_right):
        if speed is not None:
            return self._clamp(speed), self._clamp(speed)
        return self._clamp(speed_left), self._clamp(speed_right)

    def _set(self, left, right):
        self._left = left
        self._right = right
        _robot.motors(left / self.MAX_SPEED, right / self.MAX_SPEED)

    def stop(self):
        self._set(0, 0)

    def move_forward(self, speed=None, speed_left=None, speed_right=None):
        left, right = self._pair(speed, speed_left, speed_right)
        self._set(left, right)

    def move_backward(self, speed=None, speed_left=None, speed_right=None):
        left, right = self._pair(speed, speed_left, speed_right)
        self._set(-left, -right)

    def turn_left(self, speed=None, speed_left=None, speed_right=None):
        left, right = self._pair(speed, speed_left, speed_right)
        self._set(-left, right)

    def turn_right(self, speed=None, speed_left=None, speed_right=None):
        left, right = self._pair(speed, speed_left, speed_right)
        self._set(left, -right)

    def left_motor_forward(self, speed=None):
        self._set(self._clamp(speed), self._right)

    def left_motor_backward(self, speed=None):
        self._set(-self._clamp(speed), self._right)

    def right_motor_forward(self, speed=None):
        self._set(self._left, self._clamp(speed))

    def right_motor_backward(self, speed=None):
        self._set(self._left, -self._clamp(speed))

    def get_front_distance(self):
        return _robot.distance("front")

    def get_left_distance(self):
        return _robot.distance("left")

    def get_right_distance(self):
        return _robot.distance("right")

    def ir_values(self):
        return _robot.ir_values()

    def ir_line(self):
        return [v < self.ir_threshold[i + 1] for i, v in enumerate(self.ir_values())]

    def calibrate_ir(self, seconds=5):
        time.sleep(seconds)
        return self.ir_threshold

    def beep(self, freq=1000, duration=0.1):
        time.sleep(duration)

    def play_sequence(self, tones):
        for tone in tones:
            time.sleep(tone[1])

    def start_tone(self):
        pass

    def display(self, message, x=0, y=0):
        print(message)

    def is_buttonL_pressed(self):
        return False

    def is_buttonR_pressed(self):
        return False
`;

// Skulpt looks for a .js module on every path before any .py, and src/builtin comes first,
// so these shadow Skulpt's own time module.
const FILES: Record<string, string> = {
  "src/builtin/_robot.js": "var $builtinmodule = function () { return Sk.oboPlayground._robot; };",
  "src/builtin/time.js": "var $builtinmodule = function () { return Sk.oboPlayground.time; };",
  "src/builtin/obocar.py": OBOCAR_PY,
};

// Points at the student's line, not one inside the obocar module that raised it.
function pythonError(err: PyObject) {
  const text = String(err);
  const line = err?.traceback?.find((f: { filename?: string }) => f.filename === "main.py")?.lineno;
  return new Error(line ? `${text.replace(/ on line \d+$/, "")} on line ${line}` : text);
}

/** Compiles `code` and returns the sim's per-tick program: each call runs it until it next waits. */
export function pythonProgram(Sk: Skulpt, code: string, print: (text: string) => void): (robot: RobotApi) => void {
  let robot: RobotApi | null = null;
  let freePass = false; // the next while-loop pass may still run in this tick
  let wakeAt = -Infinity;
  let state: PyObject = null; // null: not started; a Suspension: waiting; anything else: finished
  let finished = false;
  let printed = 0;

  const now = () => (robot ? robot.time() * 1000 : 0);
  const fn = (f: (...args: PyObject[]) => unknown) => new Sk.builtin.func(f);
  const none = () => Sk.builtin.none.none$;
  const sleep = (ms: number) => {
    if (ms < HALF_TICK_MS) return none();
    const susp = new Sk.misceval.Suspension();
    susp.resume = none;
    susp.data = { type: SLEEP, until: now() + ms };
    return susp;
  };
  const toNumber = (v: PyObject, name: string) => {
    const n = Sk.ffi.remapToJs(v);
    if (typeof n !== "number" || !Number.isFinite(n)) throw new Sk.builtin.TypeError(`${name} must be a number`);
    return n;
  };

  Sk.oboPlayground = {
    _robot: {
      motors: fn((l, r) => {
        robot?.setMotors(toNumber(l, "speed"), toNumber(r, "speed"));
        return none();
      }),
      distance: fn((dir) => new Sk.builtin.float_(robot?.sensor(Sk.ffi.remapToJs(dir)) ?? 0)),
      ir_values: fn(() =>
        Sk.ffi.remapToPy([0, 1, 2, 3, 4, 5].map((i) => (robot?.line(i) ? IR_BLACK : IR_WHITE))),
      ),
    },
    // MicroPython's time module, on the sim's clock.
    time: {
      sleep: fn((s) => sleep(toNumber(s, "seconds") * 1000)),
      sleep_ms: fn((ms) => sleep(toNumber(ms, "ms"))),
      sleep_us: fn((us) => sleep(toNumber(us, "us") / 1000)),
      ticks_ms: fn(() => Sk.ffi.remapToPy(Math.floor(now()))),
      ticks_us: fn(() => Sk.ffi.remapToPy(Math.floor(now() * 1000))),
      ticks_diff: fn((a, b) => Sk.ffi.remapToPy(toNumber(a, "ticks") - toNumber(b, "ticks"))),
      ticks_add: fn((a, b) => Sk.ffi.remapToPy(toNumber(a, "ticks") + toNumber(b, "ticks"))),
      time: fn(() => new Sk.builtin.float_(now() / 1000)),
    },
  };

  Sk.configure({
    output: (text: string) => {
      // a program printing every tick shouldn't grow the page without bound
      if (printed < MAX_OUTPUT) print(text);
      printed += text.length;
    },
    read: (file: string) => {
      const source = FILES[file] ?? Sk.builtinFiles?.files[file];
      if (source === undefined) throw new Error(`File not found: '${file}'`);
      return source;
    },
    __future__: Sk.python3,
    execLimit: null,
    yieldLimit: null,
    killableWhile: true,
    // A while loop runs one pass per tick and then waits for the next, so a loop without
    // sleep() can't freeze the page.
    breakpoints: () => {
      const wait = !freePass;
      freePass = false;
      return wait;
    },
  });

  try {
    Sk.compile(code, "main.py", "exec", true);
  } catch (err) {
    throw pythonError(err);
  }

  return (r) => {
    robot = r;
    if (finished || now() < wakeAt - HALF_TICK_MS) return;
    // resuming a loop-top pause is already that tick's pass; starting or waking from sleep() isn't
    freePass = state?.data?.type !== "Sk.delay";
    try {
      state = state ? state.resume() : Sk.importMainWithBody("main", false, code, true);
    } catch (err) {
      finished = true;
      throw pythonError(err);
    }
    if (state instanceof Sk.misceval.Suspension) {
      wakeAt = state.data?.type === SLEEP ? state.data.until : -Infinity;
    } else {
      finished = true;
    }
  };
}
