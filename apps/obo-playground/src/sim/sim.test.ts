import { createRequire } from "node:module";

import * as Blockly from "blockly";
import { afterEach, describe, expect, it, vi } from "vitest";

import { boomLift, hitByTrain, trainProgress } from "./crossing";
import { MujocoWorld, SENSOR_RANGE } from "./mujoco-world";
import { PlaygroundSim } from "./playground-sim";
import { pythonProgram } from "./python-program";
import { Race } from "./race";
import { trackFromPreset, type Track } from "./track";
import { EXAMPLE_XML, EXAMPLES, LINE_EXAMPLE_XML, PYTHON_EXAMPLE, RAILWAY_EXAMPLE_XML } from "../blocks/examples";
import { compileWorkspace } from "../blocks/robot-blocks";

const track = (walls: Track["walls"]): Track => ({
  name: "test",
  walls,
  start: { x: 0, y: 0, heading: 0 },
  extent: 2,
  width: 0.8,
  centerline: [],
  inner: [],
  outer: [],
  startLine: null,
});
// A straight corridor along +x: wall 0.2 m to the car's left (+y), 0.6 m to its right, end wall at x = 1.5.
const corridor = track([
  { x1: -0.5, y1: 0.2, x2: 2, y2: 0.2 },
  { x1: -0.5, y1: -0.6, x2: 2, y2: -0.6 },
  { x1: 1.5, y1: -0.6, x2: 1.5, y2: 0.2 },
]);
const openFloor = track([]);
// Tape along +x at height y; the car starts at the origin heading +x.
const straightLine = (y: number): Track => ({ ...openFloor, line: { points: [[-1, y], [2, y]], width: 0.019 } });

// Disposed even when an assertion fails, so one failure can't leak wasm models or fake timers.
const cleanup: (() => void)[] = [];
afterEach(() => {
  cleanup.splice(0).forEach((dispose) => dispose());
  vi.useRealTimers();
});

async function worldOn(t: Track) {
  const world = new MujocoWorld(t);
  cleanup.push(() => world.dispose());
  await world.init();
  return world;
}

async function simOn(t: Track) {
  const sim = new PlaygroundSim(t);
  cleanup.push(() => sim.dispose());
  await sim.setTrack(t);
  return sim;
}

function runFor(world: MujocoWorld, seconds: number, left: number, right: number) {
  world.setMotors(left, right);
  for (let i = 0; i < seconds / world.timestep; i++) world.step();
}

describe("race", () => {
  it("counts a lap after one loop of the centerline", () => {
    const t = trackFromPreset("oval");
    const race = new Race(t, 3);
    race.start(0);
    const events = t.centerline
      .concat([t.centerline[0], t.centerline[1]])
      .map(([x, y], i) => race.update({ x, y }, i * 100));
    expect(events).toContain("lap");
    expect(race.lap).toBe(2);
  });

  it("counts one lap of a figure eight, not two, across its crossing", () => {
    const t = trackFromPreset("figure8");
    const race = new Race(t, 3);
    race.start(0);
    const loop = t.centerline.concat([t.centerline[0], t.centerline[1]]);
    const events = loop.map(([x, y], i) => race.update({ x, y }, i * 100));
    expect(events.filter((e) => e === "lap")).toHaveLength(1);
    expect(race.lap).toBe(2);
  });

  it("has no walls on a line course", () => {
    expect(trackFromPreset("line").walls).toHaveLength(0);
    expect(trackFromPreset("figure8").walls).toHaveLength(0);
  });

  it("finishes the maze at the goal cell", () => {
    const t = trackFromPreset("maze");
    const race = new Race(t);
    race.start(0);
    expect(race.update(t.start, 1000)).toBeNull();
    expect(race.update(t.goal!, 2000)).toBe("finish");
  });
});

describe("physics", () => {
  // Readings are measured from each HC-SR04's face to the wall's near side (walls are 2 cm thick).
  it("reads each wall on its own side", async () => {
    const world = await worldOn(corridor);
    const s = world.getSensors();
    expect(s.left).toBeCloseTo(0.2 - 0.05 - 0.01, 2);
    expect(s.right).toBeCloseTo(0.6 - 0.0497 - 0.01, 2);
    expect(s.front).toBeCloseTo(1.5 - 0.0836 - 0.01, 2);
  });

  it("gives blocks centimetres", async () => {
    const sim = await simOn(corridor);
    sim.advance(0.02); // one control tick reads the sensors
    expect(sim.api.sensor("left")).toBeCloseTo(14, 0);
  });

  it("drives toward the wall ahead", async () => {
    const world = await worldOn(corridor);
    const before = world.getSensors().front;
    runFor(world, 0.5, 0.5, 0.5);
    expect(world.getSensors().front).toBeLessThan(before - 0.08);
  });

  it("tops out near the real car's 0.51 m/s", async () => {
    const world = await worldOn(openFloor);
    runFor(world, 2, 1, 1);
    expect(world.getPose().speed).toBeGreaterThan(0.45);
    expect(world.getPose().speed).toBeLessThan(0.55);
    expect(world.getWheelAngles()[0]).toBeGreaterThan(0); // rolling forward is positive
  });

  it("turns right when the left motor is faster", async () => {
    const world = await worldOn(corridor);
    runFor(world, 0.5, 1, 0.5);
    expect(world.getPose().theta).toBeLessThan(-0.05); // clockwise seen from above
  });

  it("never sees the floor, even pitching through a hard stop", async () => {
    const world = await worldOn(openFloor);
    const seen: number[] = [];
    world.setMotors(1, 1);
    for (let i = 0; i < 500; i++) { world.step(); seen.push(...Object.values(world.getSensors())); }
    world.setMotors(-1, -1);
    for (let i = 0; i < 250; i++) { world.step(); seen.push(...Object.values(world.getSensors())); }
    expect(Math.min(...seen)).toBe(SENSOR_RANGE);
  });

  it("drive() with a positive turn favours the left wheel", () => {
    const sim = new PlaygroundSim(corridor);
    sim.api.drive(0.5, 0.5);
    expect(sim.motorL).toBeGreaterThan(sim.motorR);
  });
});

describe("line sensors", () => {
  it("sees a line under its middle sensors only", async () => {
    const world = await worldOn(straightLine(0));
    expect(world.getLineSensors()).toEqual([0, 0, 1, 1, 0, 0]);
  });

  it("sees nothing 10 cm beside the line", async () => {
    const world = await worldOn(straightLine(0.1));
    expect(world.getLineSensors()).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it("reads 0 for an index that isn't a sensor", async () => {
    const sim = await simOn(straightLine(0));
    sim.advance(0.02);
    expect([sim.api.line(2), sim.api.line(undefined), sim.api.line("x"), sim.api.line(9), sim.api.line(2.5)]).toEqual([1, 0, 0, 0, 0]);
  });

  it.each([
    [0.03, [1, 0, 0, 0, 0, 0]],
    [-0.031, [0, 0, 0, 0, 0, 1]],
  ])("the block counts 0 to 5 from left to right (line at y = %f)", async (y, expected) => {
    const sim = await simOn(straightLine(y));
    sim.advance(0.02);
    const read = (i: number) => {
      const ws = new Blockly.Workspace();
      cleanup.push(() => ws.dispose());
      ws.newBlock("robot_line").setFieldValue(String(i), "INDEX");
      return new Function("robot", `return ${compileWorkspace(ws)}`)(sim.api);
    };
    expect([0, 1, 2, 3, 4, 5].map(read)).toEqual(expected);
  });
});

describe("example program", () => {
  it.each(["oval", "clover", "slalom"])("laps the %s without touching a wall", async (key) => {
    const ws = new Blockly.Workspace();
    Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(EXAMPLE_XML), ws);
    const sim = await simOn(trackFromPreset(key));
    vi.useFakeTimers();
    sim.run(compileWorkspace(ws));
    vi.advanceTimersByTime(3000); // the 3-2-1-GO countdown
    let clearance = Infinity;
    for (let i = 0; i < 40 * 60 && sim.race.lap < 2; i++) {
      sim.advance(1 / 60);
      clearance = Math.min(clearance, sim.sensors.left, sim.sensors.right);
    }
    expect(sim.race.lap).toBe(2);
    expect(clearance).toBeGreaterThan(0.1);
  });

  it("follows the line track for a lap without losing the line", async () => {
    const ws = new Blockly.Workspace();
    cleanup.push(() => ws.dispose());
    Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(LINE_EXAMPLE_XML), ws);
    const sim = await simOn(trackFromPreset("line"));
    vi.useFakeTimers();
    sim.run(compileWorkspace(ws));
    vi.advanceTimersByTime(3000);
    let offLine = 0;
    let longestOff = 0;
    for (let i = 0; i < 40 * 60 && sim.race.lap < 2; i++) {
      sim.advance(1 / 60);
      offLine = sim.lineSensors.some(Boolean) ? 0 : offLine + 1 / 60;
      longestOff = Math.max(longestOff, offLine);
    }
    expect(sim.race.lap).toBe(2);
    expect(longestOff).toBeLessThanOrEqual(1);
    expect(sim.race.best).toBeLessThan(10); // it laps in about 9.2 s
  });

  it("spins to find the line again when no sensor sees it", async () => {
    const ws = new Blockly.Workspace();
    cleanup.push(() => ws.dispose());
    Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(LINE_EXAMPLE_XML), ws);
    const sim = await simOn(straightLine(0.05)); // 5 cm left of the car, outside the IR array
    vi.useFakeTimers();
    sim.run(compileWorkspace(ws));
    vi.advanceTimersByTime(3000);
    let found = false;
    for (let i = 0; i < 4 * 60 && !found; i++) {
      sim.advance(1 / 60);
      found = sim.lineSensors.some(Boolean);
    }
    expect(found).toBe(true);
  });
});

describe("examples menu", () => {
  it.each(EXAMPLES.map((e) => [e.title, e] as const))("%s completes its own world", async (_, example) => {
    const ws = new Blockly.Workspace();
    cleanup.push(() => ws.dispose());
    Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(example.xml), ws);
    const sim = await simOn(trackFromPreset(example.track));
    vi.useFakeTimers();
    sim.run(compileWorkspace(ws));
    vi.advanceTimersByTime(3000);
    const done = () => (sim.race.isMaze ? sim.race.finished : sim.race.lap >= 2);
    let clearance = Infinity;
    for (let i = 0; i < 120 * 60 && !done(); i++) {
      sim.advance(1 / 60);
      clearance = Math.min(clearance, sim.sensors.left, sim.sensors.right);
    }
    expect(done()).toBe(true);
    expect(clearance).toBeGreaterThan(0.01); // never scrapes a side wall
  });
});

describe("program", () => {
  it("keeps variables between ticks, like an Arduino sketch's globals", async () => {
    const sim = await simOn(openFloor);
    vi.useFakeTimers();
    sim.run("var ticks;\nticks = (ticks || 0) + 1;\nrobot.drive(ticks / 100, 0);");
    vi.advanceTimersByTime(3000);
    for (let i = 0; i < 10; i++) sim.advance(1 / 60);
    expect(sim.motorL).toBeGreaterThan(0.05);
  });
});

describe("line maze", () => {
  it("is a tree of tape: one path between any two of its 25 cells", () => {
    expect(trackFromPreset("lineMaze").tape!.segments).toHaveLength(24);
  });

  it("reads open tape on the IR sensors", async () => {
    const t = trackFromPreset("lineMaze");
    const world = await worldOn(t);
    expect(world.getLineSensors().slice(2, 4)).toEqual([1, 1]); // starts centred on its first branch
  });
});

describe("railway crossing", () => {
  const railway = trackFromPreset("railway");

  it("cycles the booms: up, lowering, down while the train passes, raising", () => {
    expect([0, 4, 6, 9].map(boomLift)).toEqual([1, 0.5, 0, 0.5]);
    expect([0, 4, 6].map((t) => trainProgress(t) !== null)).toEqual([false, false, true]);
  });

  it("puts the booms in front of the front ultrasonic sensor only while they are down", async () => {
    const { x, roads } = railway.crossing!;
    const world = await worldOn({ ...railway, start: { x: x + 0.4, y: roads[0].y, heading: Math.PI } });
    expect(world.getSensors().front).toBe(SENSOR_RANGE); // booms up at t = 0
    while (world.time < 5) world.step();
    expect(world.getSensors().front).toBeLessThan(0.2);
  });

  it("sends a car on the rails back to the start when the train comes", async () => {
    const notes: string[] = [];
    const sim = new PlaygroundSim(railway, (note) => notes.push(note.message));
    cleanup.push(() => sim.dispose());
    await sim.setTrack(railway);
    const ws = new Blockly.Workspace();
    cleanup.push(() => ws.dispose());
    Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(LINE_EXAMPLE_XML), ws); // no stop at the gate
    vi.useFakeTimers();
    sim.run(compileWorkspace(ws));
    vi.advanceTimersByTime(3000);
    for (let i = 0; i < 30 * 60 && sim.running; i++) sim.advance(1 / 60);
    expect(notes.some((m) => m.startsWith("The train came!"))).toBe(true);
    expect(sim.running).toBe(false);
  });

  it("the example waits at the booms and is never hit by the train", async () => {
    const sim = await simOn(railway);
    const ws = new Blockly.Workspace();
    cleanup.push(() => ws.dispose());
    Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(RAILWAY_EXAMPLE_XML), ws);
    vi.useFakeTimers();
    sim.run(compileWorkspace(ws));
    vi.advanceTimersByTime(3000);
    let waited = 0;
    for (let i = 0; i < 60 * 60 && !sim.race.finished; i++) {
      sim.advance(1 / 60);
      const p = sim.pose();
      if (trainProgress(sim.worldTime()) !== null) {
        expect(hitByTrain(railway.crossing!, railway.extent, sim.worldTime(), p.x, p.y)).toBe(false);
        if (p.speed < 0.01 && Math.abs(p.x - railway.crossing!.x) < 0.4) waited += 1 / 60;
      }
    }
    expect(sim.race.finished).toBe(true);
    expect(waited).toBeGreaterThan(1);
  });
});

describe("timing", () => {
  it.each([60, 120, 144])("simulates one second per wall second at %i fps", async (fps) => {
    const sim = await simOn(corridor);
    for (let i = 0; i < fps; i++) sim.advance(1 / fps);
    // within one 2 ms physics step; any leftover carries into the next frame
    expect(Math.abs(sim.simTime - 1000)).toBeLessThanOrEqual(2.0001);
  });
});

// The browser loads Skulpt from skulpt.org (as obo-code does); tests use the npm build.
const Sk = createRequire(import.meta.url)("skulpt");

async function runPython(t: Track, code: string) {
  const notes: string[] = [];
  const sim = new PlaygroundSim(t, (n) => notes.push(n.message));
  cleanup.push(() => sim.dispose());
  await sim.setTrack(t);
  let output = "";
  vi.useFakeTimers();
  sim.run(() => pythonProgram(Sk, code, (text) => (output += text)));
  vi.advanceTimersByTime(3000);
  return { sim, notes, output: () => output };
}

const seconds = (sim: PlaygroundSim, s: number, until = () => false) => {
  for (let i = 0; i < s * 60 && !until(); i++) sim.advance(1 / 60);
};

describe("python program", () => {
  it("stops before the wall ahead, written against the real car's SDK", async () => {
    const { sim } = await runPython(
      corridor,
      `from obocar import OBOCar
car = OBOCar()
while car.get_front_distance() > 20:
    car.move_forward(300)
car.stop()
`,
    );
    seconds(sim, 6);
    expect(sim.motorL).toBe(0);
    expect(sim.pose().speed).toBeLessThan(0.01);
    expect(sim.sensors.front).toBeGreaterThan(0.1);
    expect(sim.sensors.front).toBeLessThan(0.2);
  });

  it("time.sleep() waits on the sim clock", async () => {
    const { sim } = await runPython(
      openFloor,
      `from obocar import OBOCar
import time
car = OBOCar()
car.move_forward(512)
time.sleep(1)
car.turn_left(256)
`,
    );
    seconds(sim, 0.9);
    expect([sim.motorL, sim.motorR]).toEqual([1, 1]);
    seconds(sim, 0.2);
    expect([sim.motorL, sim.motorR]).toEqual([-0.5, 0.5]);
  });

  it("runs a loop without sleep() once per control tick", async () => {
    const { sim, output } = await runPython(openFloor, "n = 0\nwhile True:\n    n += 1\n    print(n)\n");
    seconds(sim, 1);
    // one pass per 16 ms tick: about 62 in a second
    expect(output().trim().split("\n").length).toBeGreaterThan(55);
    expect(output().trim().split("\n").length).toBeLessThan(70);
  });

  it("says once when print() output passes the limit", async () => {
    const { sim, output } = await runPython(openFloor, 'while True:\n    print("x" * 1000)\n');
    seconds(sim, 1);
    expect(output().split("Output limit reached")).toHaveLength(2);
    expect(output().length).toBeLessThan(22_000);
  });

  it("laps the oval with the Code tab's starting program", async () => {
    const { sim } = await runPython(trackFromPreset("oval"), PYTHON_EXAMPLE);
    let clearance = Infinity;
    seconds(sim, 40, () => {
      clearance = Math.min(clearance, sim.sensors.left, sim.sensors.right);
      return sim.race.lap >= 2;
    });
    expect(sim.race.lap).toBe(2);
    expect(clearance).toBeGreaterThan(0.05);
  });

  it("follows the line track with ir_line()", async () => {
    const { sim } = await runPython(
      trackFromPreset("line"),
      `from obocar import OBOCar
car = OBOCar()
while True:
    line = car.ir_line()
    left = line[0] + line[1] + line[2]
    right = line[3] + line[4] + line[5]
    if left + right == 0:
        car.turn_right(205)
        continue
    speed = 205 if line[0] or line[5] else 512
    turn = (right - left) * 128
    car.move_forward(speed_left=speed + turn, speed_right=speed - turn)
`,
    );
    seconds(sim, 40, () => sim.race.lap >= 2);
    expect(sim.race.lap).toBe(2);
  });

  it("raises the car's TypeError for a float speed, with the line", async () => {
    const { sim, notes } = await runPython(openFloor, "from obocar import OBOCar\ncar = OBOCar()\ncar.move_forward(100.5)\n");
    seconds(sim, 0.1);
    expect(sim.running).toBe(false);
    expect(notes.join()).toMatch(/TypeError: can't convert float to int.*line 3/);
  });

  it("reports a syntax error at Run, before the countdown", async () => {
    const notes: string[] = [];
    const sim = new PlaygroundSim(openFloor, (n) => notes.push(n.message));
    cleanup.push(() => sim.dispose());
    sim.run(() => pythonProgram(Sk, "while True\n    pass\n", () => {}));
    expect(sim.running).toBe(false);
    expect(notes[0]).toMatch(/^Could not read your code: SyntaxError/);
  });
});
