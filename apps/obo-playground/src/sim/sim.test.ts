import { describe, expect, it } from "vitest";

import { MujocoWorld, SENSOR_RANGE } from "./mujoco-world";
import { PlaygroundSim } from "./playground-sim";
import { Race } from "./race";
import { trackFromPreset, type Track } from "./track";

// A straight corridor along +x: wall 1 m to the car's left (+y), 3 m to its right, end wall at x = 5.
const corridor: Track = {
  name: "test corridor",
  walls: [
    { x1: -2, y1: 1, x2: 6, y2: 1 },
    { x1: -2, y1: -3, x2: 6, y2: -3 },
    { x1: 5, y1: -3, x2: 5, y2: 1 },
  ],
  start: { x: 0, y: 0, heading: 0 },
  extent: 8,
  width: 4,
  centerline: [],
  inner: [],
  outer: [],
  startLine: null,
};

async function worldOn(track: Track) {
  const world = new MujocoWorld(track);
  await world.init();
  return world;
}

function runFor(world: MujocoWorld, seconds: number, left: number, right: number) {
  world.setMotors(left, right);
  for (let i = 0; i < seconds / world.timestep; i++) world.step();
}

describe("race", () => {
  it("counts a lap after one loop of the centerline", () => {
    const track = trackFromPreset("oval");
    const race = new Race(track, 3);
    race.start(0);
    const events = track.centerline
      .concat([track.centerline[0], track.centerline[1]])
      .map(([x, y], i) => race.update({ x, y }, i * 100));
    expect(events).toContain("lap");
    expect(race.lap).toBe(2);
  });

  it("finishes the maze at the goal cell", () => {
    const track = trackFromPreset("maze");
    const race = new Race(track);
    race.start(0);
    expect(race.update(track.start, 1000)).toBeNull();
    expect(race.update(track.goal!, 2000)).toBe("finish");
  });
});

describe("physics", () => {
  it("reads each wall on its own side", async () => {
    const world = await worldOn(corridor);
    const s = world.getSensors();
    expect(s.left).toBeCloseTo(1 - 0.12 - 0.26, 1);
    expect(s.right).toBeCloseTo(3 - 0.12 - 0.26, 1);
    expect(s.front).toBeLessThan(SENSOR_RANGE);
    world.dispose();
  });

  it("drives toward the wall ahead", async () => {
    const world = await worldOn(corridor);
    const before = world.getSensors().front;
    runFor(world, 0.5, 0.5, 0.5);
    expect(world.getSensors().front).toBeLessThan(before - 0.3);
    world.dispose();
  });

  it("turns right when the left motor is faster", async () => {
    const world = await worldOn(corridor);
    runFor(world, 0.5, 1, 0.5);
    expect(world.getPose().theta).toBeLessThan(-0.05); // clockwise seen from above
    world.dispose();
  });

  it("drive() with a positive turn favours the left wheel", () => {
    const sim = new PlaygroundSim(corridor);
    sim.api.drive(0.5, 0.5);
    expect(sim.motorL).toBeGreaterThan(sim.motorR);
  });
});

describe("timing", () => {
  it.each([60, 120, 144])("simulates one second per wall second at %i fps", async (fps) => {
    const sim = new PlaygroundSim(corridor);
    await sim.setTrack(corridor);
    for (let i = 0; i < fps; i++) sim.advance(1 / fps);
    // within one 5 ms physics step; any leftover carries into the next frame
    expect(Math.abs(sim.simTime - 1000)).toBeLessThanOrEqual(5.0001);
    sim.dispose();
  });
});
