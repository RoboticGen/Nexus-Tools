// Level crossings: one line of rails runs along y at x and crosses two-way roads running along x.
// Booms close each road on a fixed cycle while a train passes. The cycle runs on the world's own
// clock, which restarts with every Run, so a program meets the gates the same way each time.

export interface Crossing {
  x: number;
  roads: { y: number }[];
}

export const BOOM = {
  offset: 0.14, // from the rails to each boom, along the road
  side: 0.24, // from the road to each boom's pivot
  reach: 0.4, // arm length, enough to span the road from the pivot
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

// Two full booms per road, one each side of the rails, pivoting on opposite sides of the road.
// Boom i belongs to road i >> 1. `dir` is the way each arm points (y).
export function booms(c: Crossing) {
  return c.roads.flatMap(({ y }) => [
    { x: c.x - BOOM.offset, y: y + BOOM.side, dir: -1 },
    { x: c.x + BOOM.offset, y: y - BOOM.side, dir: 1 },
  ]);
}

// Whether a car at (x, y) is between a road's two booms.
export const betweenBooms = (c: Crossing, road: { y: number }, x: number, y: number) =>
  Math.abs(x - c.x) < BOOM.offset + CAR_HALF && Math.abs(y - road.y) < BOOM.side;

// Vehicle detection, as at crossings gated on both sides: the booms never come down on a car
// between them, so it can always drive out, and they close behind it once it has left.
export function heldLift(lift: number, t: number, dt: number, occupied: boolean): number {
  const target = boomLift(t);
  return occupied ? Math.max(lift, target) : Math.max(target, lift - dt / PHASES[1]);
}

// Whether a car at (x, y) is on the rails where the train is right now.
export function hitByTrain(c: Crossing, extent: number, t: number, x: number, y: number): boolean {
  const span = trainSpan(t, railHalfLength(extent));
  return !!span && Math.abs(x - c.x) < RAIL_ZONE && y > span[0] - CAR_HALF && y < span[1] + CAR_HALF;
}
