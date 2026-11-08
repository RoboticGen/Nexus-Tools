import * as Blockly from "blockly";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MujocoWorld, SENSOR_RANGE } from "./mujoco-world";
import { PlaygroundSim } from "./playground-sim";
import { Race } from "./race";
import { trackFromPreset, type Track } from "./track";
import { compileWorkspace, EXAMPLE_XML, LINE_EXAMPLE_XML } from "../blocks/robot-blocks";

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
const straightLine = (y: number): Track => ({ ...openFloor, line: [[-1, y], [2, y]], lineWidth: 0.019 });

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
});

describe("timing", () => {
  it.each([60, 120, 144])("simulates one second per wall second at %i fps", async (fps) => {
    const sim = await simOn(corridor);
    for (let i = 0; i < fps; i++) sim.advance(1 / fps);
    // within one 2 ms physics step; any leftover carries into the next frame
    expect(Math.abs(sim.simTime - 1000)).toBeLessThanOrEqual(2.0001);
  });
});
