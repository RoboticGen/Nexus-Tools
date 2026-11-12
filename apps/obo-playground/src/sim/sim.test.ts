import * as Blockly from "blockly";
import { afterEach, describe, expect, it, vi } from "vitest";

import { boomLift, hitByTrain, trainProgress } from "./crossing";
import { mulberry32 } from "./maze";
import { MujocoWorld, SENSOR_RANGE } from "./mujoco-world";
import { PlaygroundSim } from "./playground-sim";
import { Race } from "./race";
import { trackFromPreset, type Track } from "./track";
import { EXAMPLE_XML, EXAMPLES, LINE_EXAMPLE_XML, RAILWAY_EXAMPLE_XML, ROOMBA_EXAMPLE_XML } from "../blocks/examples";
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
  vi.restoreAllMocks();
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
    vi.spyOn(Math, "random").mockImplementation(mulberry32(1));
    vi.useFakeTimers();
    sim.run(compileWorkspace(ws));
    vi.advanceTimersByTime(3000);
    const done = () => (sim.race.isMaze || sim.race.coverage ? sim.race.finished : sim.race.lap >= 2);
    let clearance = Infinity;
    for (let i = 0; i < 180 * 60 && !done(); i++) {
      sim.advance(1 / 60);
      clearance = Math.min(clearance, sim.sensors.left, sim.sensors.right);
    }
    expect(done()).toBe(true);
    // never scrapes a side wall; a robot vacuum bumps into things by design
    if (!sim.race.coverage) expect(clearance).toBeGreaterThan(0.01);
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

describe("living room", () => {
  const room = trackFromPreset("room");
  const runBlocks = async (code: string) => {
    const notes: string[] = [];
    const sim = new PlaygroundSim(room, (note) => notes.push(note.message));
    cleanup.push(() => sim.dispose());
    await sim.setTrack(room);
    vi.useFakeTimers();
    sim.run(code);
    vi.advanceTimersByTime(3000);
    return { sim, notes };
  };
  const roomba = () => {
    const ws = new Blockly.Workspace();
    cleanup.push(() => ws.dispose());
    Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(ROOMBA_EXAMPLE_XML), ws);
    return compileWorkspace(ws);
  };

  it("puts furniture in front of the ultrasonic sensors and leaves it out of the floor to clean", async () => {
    const world = await worldOn(room);
    const stool = room.furniture![3];
    expect(world.getSensors().front).toBeCloseTo(stool.x - stool.hx - room.start.x - 0.0836, 2);
    const { dirty } = room.clean!;
    expect(dirty.includes(0)).toBe(true);
    expect(dirty.includes(1)).toBe(true);
  });

  it("starts with a dirty floor and cleans more of it as the car drives", async () => {
    const { sim } = await runBlocks("robot.drive(0.6, 0.1);");
    const coverage = sim.race.coverage!;
    expect(coverage.fraction).toBe(0);
    const seen: number[] = [];
    for (let s = 0; s < 4; s++) {
      for (let i = 0; i < 60; i++) sim.advance(1 / 60);
      seen.push(coverage.fraction);
    }
    expect(seen[0]).toBeGreaterThan(0);
    expect(seen).toEqual([...seen].sort((a, b) => a - b));
    expect(seen[3]).toBeGreaterThan(seen[0]);
    sim.resetCar();
    expect(coverage.fraction).toBe(0);
  });

  it("stops with a notice when time runs out", async () => {
    const { sim, notes } = await runBlocks("robot.drive(0, 0.3);"); // spins on the spot
    for (let i = 0; i < (room.clean!.seconds + 1) * 60 && sim.running; i++) sim.advance(1 / 60);
    expect(sim.running).toBe(false);
    expect(sim.race.finished).toBe(true);
    expect(sim.race.coverage!.fraction).toBeLessThan(room.clean!.target);
    expect(notes.some((m) => m.startsWith("Time's up!"))).toBe(true);
  });

  // Its turns are random, so try a few seeds: each run took 68 to 128 s over 30 seeds.
  it.each([1, 2, 3])("the robot vacuum example cleans the target share in time (seed %i)", async (seed) => {
    vi.spyOn(Math, "random").mockImplementation(mulberry32(seed));
    const { sim, notes } = await runBlocks(roomba());
    for (let i = 0; i < (room.clean!.seconds + 1) * 60 && sim.running; i++) sim.advance(1 / 60);
    expect(sim.race.coverage!.fraction).toBeGreaterThanOrEqual(room.clean!.target);
    expect(sim.race.elapsed).toBeLessThan(150);
    expect(notes.some((m) => m.startsWith("Room clean!"))).toBe(true);
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
