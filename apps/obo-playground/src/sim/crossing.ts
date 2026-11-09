// Level crossings: one line of rails runs along y at x and crosses one-way roads running along x.
// Booms close each road on a fixed cycle while a train passes. The cycle runs on the world's own
// clock, which restarts with every Run, so a program meets the gates the same way each time.

export interface Crossing {
  x: number;
  roads: { y: number; dir: 1 | -1 }[]; // dir: the way traffic drives along x
}

export const BOOM = {
  offset: 0.14, // from the rails to each boom, along the road
  side: 0.24, // from the road to each boom's pivot
  reach: 0.4, // arm length, enough to span the road from the pivot
  exitReach: 0.16, // the far side's half barrier stops short of the road, so a car can always drive out
  height: 0.043, // arm centre when down: level with the ultrasonic sensors
  half: 0.012, // arm half-thickness
};
// Seconds: open, lowering, closed (the train passes), raising.
const PHASES = [3.5, 1, 4, 1] as const;
const PERIOD = PHASES.reduce((a, b) => a + b, 0);
const RAIL_ZONE = 0.09; // the car is on the rails when its axle is this close to them
const CAR_HALF = 0.08;
export const TRAIN_LENGTH = 0.9;

// 1 with the booms up, 0 with them down.
export function boomLift(t: number): number {
  let s = ((t % PERIOD) + PERIOD) % PERIOD;
  if (s < PHASES[0]) return 1;
  s -= PHASES[0];
  if (s < PHASES[1]) return 1 - s / PHASES[1];
  s -= PHASES[1];
  if (s < PHASES[2]) return 0;
  s -= PHASES[2];
  return s / PHASES[3];
}

// How far through the closed phase we are, 0 to 1, or null while the booms are moving or up.
export function trainProgress(t: number): number | null {
  const s = (((t % PERIOD) + PERIOD) % PERIOD) - PHASES[0] - PHASES[1];
  return s >= 0 && s < PHASES[2] ? s / PHASES[2] : null;
}

// The train's tail and head along the rails (y), or null between trains. Over the closed phase it
// runs from one edge of the floor (halfLength from the centre) to past the other.
export function trainSpan(t: number, halfLength: number): [number, number] | null {
  const p = trainProgress(t);
  if (p === null) return null;
  const head = -halfLength + p * (2 * halfLength + TRAIN_LENGTH);
  return [head - TRAIN_LENGTH, head];
}

// The floor is the track's extent plus 0.75 m each side; the rails run its full length.
export const railHalfLength = (extent: number) => extent + 0.75;

// Two booms per road, one each side of the rails, pivoting on opposite sides of the road: a full
// barrier before the rails and a half barrier after them. `dir` is the way each arm points (y).
export function booms(c: Crossing) {
  return c.roads.flatMap(({ y, dir }) => [
    { x: c.x - dir * BOOM.offset, y: y + dir * BOOM.side, dir: -dir, reach: BOOM.reach },
    { x: c.x + dir * BOOM.offset, y: y - dir * BOOM.side, dir, reach: BOOM.exitReach },
  ]);
}

// Whether a car at (x, y) is on the rails where the train is right now.
export function hitByTrain(c: Crossing, extent: number, t: number, x: number, y: number): boolean {
  const span = trainSpan(t, railHalfLength(extent));
  return !!span && Math.abs(x - c.x) < RAIL_ZONE && y > span[0] - CAR_HALF && y < span[1] + CAR_HALF;
}
