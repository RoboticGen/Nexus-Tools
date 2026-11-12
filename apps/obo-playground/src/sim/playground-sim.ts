// The playground's brain, outside React: owns the world, race, student program and motors.
// The 3D view calls advance() every frame; React reads a snapshot refreshed ~10x a second.

import { hitByTrain } from "./crossing";
import { LINE_SITES, MujocoWorld, SENSOR_RANGE, type Pose, type SensorDir, type Sensors } from "./mujoco-world";
import { Race } from "./race";

import type { Track } from "./track";

export type Mode = "program" | "manual";
export type EngineState = "loading" | "ready" | "error";
export interface Notice {
  tone: "info" | "success" | "error";
  message: string;
}

export interface RobotApi {
  sensor(dir: string): number;
  line(index: unknown): number;
  speed(): number;
  time(): number;
  setMotors(left: unknown, right: unknown): void;
  drive(speed: unknown, turn: unknown): void;
}

export interface Snapshot {
  engine: EngineState;
  mode: Mode;
  running: boolean;
  countdown: string | null;
  trackName: string;
  isMaze: boolean;
  lap: number;
  totalLaps: number;
  elapsed: number;
  best: number | null;
  finished: boolean;
  speed: number;
  omega: number;
  sensors: Sensors;
  lineSensors: number[];
  motorL: number;
  motorR: number;
}

// The robot's brain runs every 8 physics steps (16 ms), whatever the display's refresh rate.
const CONTROL_EVERY = 8;
const MAX_FRAME_DT = 0.05;
const SNAPSHOT_MS = 100;
const COUNTDOWN = ["3", "2", "1", "GO!"];

const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));
const num = (v: unknown) => Number(v) || 0;

export class PlaygroundSim {
  track: Track;
  world: MujocoWorld | null = null;
  race: Race;
  engine: EngineState = "loading";
  mode: Mode = "program";
  running = false;
  armed = false; // GO has been given; only now may the program drive
  countdown: string | null = null;
  keys = new Set<string>();
  sensors: Sensors = { front: SENSOR_RANGE, left: SENSOR_RANGE, right: SENSOR_RANGE };
  lineSensors: number[] = LINE_SITES.map(() => 0);
  motorL = 0;
  motorR = 0;
  simTime = 0; // ms of simulated time; laps and robot.time() use this, not the wall clock

  private program: ((robot: RobotApi) => void) | null = null;
  private simAcc = 0;
  private physTick = 0;
  private startTime = 0;
  private countdownTimer: ReturnType<typeof setTimeout> | undefined;
  private worldToken = 0;
  private sinceSnapshot = 0;
  private listeners = new Set<() => void>();
  private snapshot: Snapshot;

  constructor(track: Track, private notify: (n: Notice) => void = () => {}) {
    this.track = track;
    this.race = new Race(track);
    this.snapshot = this.buildSnapshot();
  }

  readonly api: RobotApi = {
    // Blocks see centimetres, like the real HC-SR04 code; the sim works in metres.
    sensor: (dir) => (this.sensors[dir as SensorDir] ?? SENSOR_RANGE) * 100,
    line: (index) => {
      const i = Number(index);
      return Number.isInteger(i) ? (this.lineSensors[i] ?? 0) : 0;
    },
    speed: () => this.pose().speed * 100,
    time: () => (this.simTime - this.startTime) / 1000,
    setMotors: (left, right) => {
      this.motorL = clamp1(num(left));
      this.motorR = clamp1(num(right));
    },
    // turn > 0 turns right: the left wheel spins faster
    drive: (speed, turn) => {
      const s = num(speed);
      const t = num(turn);
      this.motorL = clamp1(s + t);
      this.motorR = clamp1(s - t);
    },
  };

  async setTrack(track: Track): Promise<void> {
    this.stop();
    this.track = track;
    this.race = new Race(track);
    this.world?.dispose();
    this.world = null;
    const token = ++this.worldToken;
    if (this.engine !== "ready") this.engine = "loading";
    this.changed();

    const world = new MujocoWorld(track);
    try {
      await world.init();
    } catch (err) {
      console.error("MuJoCo failed to load:", err);
      if (token === this.worldToken) {
        this.engine = "error";
        this.changed();
      }
      return;
    }
    // a newer track was picked while this one was loading
    if (token !== this.worldToken) {
      world.dispose();
      return;
    }
    this.world = world;
    this.engine = "ready";
    this.resetCar();
  }

  pose(): Pose {
    const s = this.track.start;
    return this.world?.getPose() ?? { x: s.x, y: s.y, theta: s.heading, speed: 0, omega: 0 };
  }

  resetCar() {
    this.world?.reset();
    this.race.reset();
    this.program = null;
    this.stop();
  }

  // Block code, or a per-tick program built elsewhere (the Python runner).
  run(code: string | (() => (robot: RobotApi) => void)) {
    if (typeof code === "string" && !code.trim()) {
      this.notify({ tone: "info", message: "Add some blocks first!" });
      return;
    }
    let compiled: (robot: RobotApi) => void;
    try {
      if (typeof code === "string") {
        // Blockly declares every variable on the first line. Declaring them once, outside the per-tick
        // function, lets variables keep their values between ticks, like an Arduino sketch's globals.
        const [, vars = "", body] = /^(var [\w$]+(?:, [\w$]+)*;)?([\s\S]*)$/.exec(code)!;
        compiled = new Function(`${vars}\nreturn function (robot) {\n${body}\n};`)() as (robot: RobotApi) => void;
      } else {
        compiled = code();
      }
    } catch (err) {
      const what = typeof code === "string" ? "your blocks" : "your code";
      this.notify({ tone: "error", message: `Could not read ${what}: ${(err as Error).message}` });
      return;
    }
    this.resetCar();
    this.program = compiled;
    this.running = true;
    this.startTime = this.simTime;
    this.startCountdown(() => {
      this.armed = true;
      this.startTime = this.simTime;
      this.race.start(this.simTime);
    });
    this.changed();
  }

  stop() {
    clearTimeout(this.countdownTimer);
    this.countdown = null;
    this.running = false;
    this.armed = false;
    this.motorL = 0;
    this.motorR = 0;
    this.changed();
  }

  setMode(mode: Mode) {
    this.mode = mode;
    if (mode === "manual") {
      this.stop();
      this.race.start(this.simTime);
      this.startTime = this.simTime;
    }
    this.changed();
  }

  // Fixed-timestep accumulator: simulate exactly the elapsed wall time (capped at 50 ms a
  // frame), so the car's speed and lap times don't depend on the screen's refresh rate.
  advance(frameSeconds: number) {
    const world = this.world;
    if (!world?.ready) return;
    const dt = Math.min(MAX_FRAME_DT, frameSeconds);
    const ts = world.timestep;
    this.simAcc += dt;
    while (this.simAcc >= ts) {
      this.simAcc -= ts;
      if (this.physTick++ % CONTROL_EVERY === 0) this.controlTick(world);
      world.step();
      this.simTime += ts * 1000;
      this.raceTick(world.getPose());
      this.crossingTick(world);
    }
    this.sinceSnapshot += dt * 1000;
    if (this.sinceSnapshot >= SNAPSHOT_MS) this.changed();
  }

  private controlTick(world: MujocoWorld) {
    this.sensors = world.getSensors();
    this.lineSensors = world.getLineSensors();
    if (this.mode === "manual") {
      let s = 0;
      let t = 0;
      if (this.keys.has("ArrowUp")) s += 0.7;
      if (this.keys.has("ArrowDown")) s -= 0.5;
      if (this.keys.has("ArrowLeft")) t -= 0.3;
      if (this.keys.has("ArrowRight")) t += 0.3;
      this.api.drive(s, t);
    } else if (this.running && this.armed && this.program) {
      try {
        this.program(this.api);
      } catch (err) {
        this.stop();
        this.notify({ tone: "error", message: `Program error: ${(err as Error).message}` });
      }
    } else {
      this.motorL = 0;
      this.motorR = 0;
    }
    world.setMotors(this.motorL, this.motorR);
  }

  // Simulated seconds since the car was last reset; the crossing's booms and train run on it.
  worldTime(): number {
    return this.world?.time ?? 0;
  }

  // A train that reaches the car on the rails sends it back to the start.
  private crossingTick(world: MujocoWorld) {
    const { crossing, extent } = this.track;
    const { x, y } = world.getPose();
    const driving = this.running || this.mode === "manual";
    if (!crossing || !driving || !hitByTrain(crossing, extent, world.time, x, y)) return;
    this.resetCar();
    this.notify({ tone: "error", message: "The train came! Stop at the gate when your front sensor sees it down." });
  }

  private raceTick(pose: Pose) {
    const evt = this.race.update(pose, this.simTime);
    if (evt === "lap") {
      this.notify({ tone: "success", message: `Lap ${this.race.lap - 1} complete!` });
    } else if (evt === "finish") {
      this.stop();
      const best = this.race.best?.toFixed(2);
      this.notify({
        tone: "success",
        message: this.race.isMaze
          ? `Maze solved in ${this.race.elapsed.toFixed(2)}s!`
          : `Race finished! Best lap: ${best ? `${best}s` : "none yet"}`,
      });
    }
  }

  private startCountdown(onGo: () => void) {
    let i = 0;
    this.countdown = COUNTDOWN[0];
    const tick = () => {
      i++;
      if (i < COUNTDOWN.length) {
        this.countdown = COUNTDOWN[i];
        this.countdownTimer = setTimeout(tick, 700);
      } else {
        this.countdown = null;
        onGo();
      }
      this.changed();
    };
    this.countdownTimer = setTimeout(tick, 700);
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  private changed() {
    this.sinceSnapshot = 0;
    this.snapshot = this.buildSnapshot();
    this.listeners.forEach((l) => l());
  }

  private buildSnapshot(): Snapshot {
    const pose = this.pose();
    return {
      engine: this.engine,
      mode: this.mode,
      running: this.running,
      countdown: this.countdown,
      trackName: this.track.name,
      isMaze: this.race.isMaze,
      lap: Math.min(this.race.lap, this.race.totalLaps),
      totalLaps: this.race.totalLaps,
      elapsed: this.race.elapsed,
      best: this.race.best,
      finished: this.race.finished,
      speed: pose.speed,
      omega: pose.omega,
      sensors: this.sensors,
      lineSensors: this.lineSensors,
      motorL: this.motorL,
      motorR: this.motorR,
    };
  }

  dispose() {
    clearTimeout(this.countdownTimer);
    this.worldToken++;
    this.world?.dispose();
    this.world = null;
    this.listeners.clear();
  }
}
