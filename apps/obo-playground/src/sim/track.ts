// A track is walls from a centerline + width, tape on an open floor, or a maze. Physics and
// rendering both read it; x/y on the ground in metres, sized for the 12 cm OBO Car.

import { generateLineMaze, generateMaze } from "./maze";
import { generateRoom, type CleanGrid, type Furniture } from "./room";

import type { Crossing } from "./crossing";

export type Point = [number, number];

export interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Track {
  name: string;
  walls: Wall[];
  start: { x: number; y: number; heading: number };
  extent: number;
  width: number;
  centerline: Point[];
  inner: Point[];
  outer: Point[];
  startLine: { ax: number; ay: number; bx: number; by: number } | null;
  wallHeight?: number;
  posts?: Point[];
  goal?: { x: number; y: number; r: number };
  cell?: number;
  line?: { points: Point[]; width: number }; // closed loop of tape
  tape?: { segments: Wall[]; width: number }; // open tape: a line maze's branches and dead ends
  crossing?: Crossing;
  furniture?: Furniture[];
  clean?: CleanGrid;
}

// Two straights joined by constant-radius semicircles; starts mid top straight heading +x.
function sampleStadium(halfX: number, R: number, n: number): Point[] {
  const straight = 2 * halfX;
  const arc = Math.PI * R;
  const perim = 2 * straight + 2 * arc;
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    let d = (i / n) * perim;
    if (d < halfX) { pts.push([d, R]); continue; }
    d -= halfX;
    if (d < arc) { const a = Math.PI / 2 - d / R; pts.push([halfX + Math.cos(a) * R, Math.sin(a) * R]); continue; }
    d -= arc;
    if (d < straight) { pts.push([halfX - d, -R]); continue; }
    d -= straight;
    if (d < arc) { const a = -Math.PI / 2 - d / R; pts.push([-halfX + Math.cos(a) * R, Math.sin(a) * R]); continue; }
    d -= arc;
    pts.push([-halfX + d, R]);
  }
  return pts;
}

// r = R0 + A·cos(3θ): a small A keeps it one non-self-crossing loop with three bends.
function sampleClover(R0: number, A: number, n: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const r = R0 + A * Math.cos(3 * t);
    pts.push([r * Math.cos(t), r * Math.sin(t)]);
  }
  return pts;
}

// Wavy top and bottom straights joined by U-turns; `bumps` must be odd so the waves never meet.
function sampleSerpentine(halfX: number, R: number, amp: number, bumps: number, n: number): Point[] {
  const straight = 2 * halfX;
  const arc = Math.PI * R;
  const perim = 2 * straight + 2 * arc;
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    let d = (i / n) * perim;
    if (d < straight) {
      pts.push([-halfX + d, R + amp * Math.sin(bumps * Math.PI * (d / straight))]);
      continue;
    }
    d -= straight;
    if (d < arc) { const a = Math.PI / 2 - d / R; pts.push([halfX + Math.cos(a) * R, Math.sin(a) * R]); continue; }
    d -= arc;
    if (d < straight) {
      pts.push([halfX - d, -R - amp * Math.sin(bumps * Math.PI * (d / straight))]);
      continue;
    }
    d -= straight;
    const a = -Math.PI / 2 - d / R;
    pts.push([-halfX + Math.cos(a) * R, Math.sin(a) * R]);
  }
  return pts;
}

// r = R0 + A·cos 2θ + D·sin θ: a bean with a dent on one side, so a follower meets both left and
// right turns. Starts mid top heading +x.
function sampleBean(R0: number, A: number, D: number, n: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const t = Math.PI / 2 - (i / n) * Math.PI * 2;
    const r = R0 + A * Math.cos(2 * t) + D * Math.sin(t);
    pts.push([r * Math.cos(t), r * Math.sin(t)]);
  }
  return pts;
}

// A lemniscate of Gerono (x = A·sin t, y = B·sin t·cos t): a figure eight whose tape crosses itself
// at the origin, so a follower has to drive straight over a junction. Starts at the right lobe's tip,
// clear of the crossing, heading -y.
function sampleFigureEight(A: number, B: number, n: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const t = Math.PI / 2 + (i / n) * Math.PI * 2;
    pts.push([A * Math.sin(t), B * Math.sin(t) * Math.cos(t)]);
  }
  return pts;
}

type Preset =
  | { name: string; width: number; centerline: Point[] }
  | { name: string; line: Point[]; lineWidth: number; crossing?: Crossing }
  | { name: string; maze: { cols: number; rows: number; cell: number; seed: number } }
  | { name: string; lineMaze: { cols: number; rows: number; cell: number; seed: number } }
  | { name: string; room: { w: number; h: number; furniture: Furniture[]; start: Track["start"] } };

export const TRACK_PRESETS: Record<string, Preset> = {
  oval: { name: "Speedway Oval", width: 0.5, centerline: sampleStadium(1.0, 0.75, 32) },
  clover: { name: "Clover Loop", width: 0.5, centerline: sampleClover(1.25, 0.3, 54) },
  slalom: { name: "Slalom Loop", width: 0.5, centerline: sampleSerpentine(1.25, 0.75, 0.28, 3, 60) },
  line: { name: "Line Follower", line: sampleBean(0.6, 0.2, 0.12, 120), lineWidth: 0.019 },
  figure8: { name: "Figure Eight", line: sampleFigureEight(1.1, 1.1, 160), lineWidth: 0.019 },
  maze: { name: "Micromouse Maze", maze: { cols: 7, rows: 7, cell: 0.3, seed: 7 } },
  lineMaze: { name: "Line Maze", lineMaze: { cols: 5, rows: 5, cell: 0.3, seed: 1 } },
  // The rails cross both straights, clear of the start at x = 0.
  railway: {
    name: "Railway Crossing",
    line: sampleStadium(0.7, 0.55, 120),
    lineWidth: 0.019,
    crossing: { x: -0.35, roads: [{ y: -0.55 }, { y: 0.55 }] },
  },
  // Sofa on the back wall, a bookshelf, an armchair in a corner and a footstool in the middle.
  room: {
    name: "Living Room",
    room: {
      w: 1.5,
      h: 1.2,
      furniture: [
        { x: -0.15, y: 0.48, hx: 0.3, hy: 0.12, h: 0.12 },
        { x: 0.66, y: 0.05, hx: 0.09, hy: 0.22, h: 0.22 },
        { x: -0.6, y: -0.45, hx: 0.15, hy: 0.15, h: 0.11 },
        { x: 0.15, y: -0.1, hx: 0.11, hy: 0.11, h: 0.07 },
      ],
      start: { x: -0.4, y: 0, heading: 0 },
    },
  },
};

function norm(x: number, y: number): Point {
  const m = Math.hypot(x, y) || 1;
  return [x / m, y / m];
}

// Offset a closed centerline by half the width using averaged vertex normals (smooth corners).
export function offsetLoop(centerline: Point[], width: number) {
  const n = centerline.length;
  const inner: Point[] = [];
  const outer: Point[] = [];
  for (let i = 0; i < n; i++) {
    const prev = centerline[(i - 1 + n) % n];
    const cur = centerline[i];
    const next = centerline[(i + 1) % n];
    const [dx1, dy1] = norm(cur[0] - prev[0], cur[1] - prev[1]);
    const [dx2, dy2] = norm(next[0] - cur[0], next[1] - cur[1]);
    const nA: Point = [-dy1, dx1];
    const nB: Point = [-dy2, dx2];
    const [nx, ny] = norm(nA[0] + nB[0], nA[1] + nB[1]);
    // miter compensation keeps the corridor width roughly constant on corners
    const cos = nx * nA[0] + ny * nA[1];
    const h = (width / 2) * Math.min(2.2, 1 / Math.max(0.4, cos));
    outer.push([cur[0] + nx * h, cur[1] + ny * h]);
    inner.push([cur[0] - nx * h, cur[1] - ny * h]);
  }
  return { inner, outer };
}

function ringToWalls(ring: Point[]): Wall[] {
  return ring.map((a, i) => {
    const b = ring[(i + 1) % ring.length];
    return { x1: a[0], y1: a[1], x2: b[0], y2: b[1] };
  });
}

export function buildTrack(centerline: Point[], width: number, name = "Custom track"): Track {
  const { inner, outer } = offsetLoop(centerline, width);
  const start = centerline[0];
  const next = centerline[1 % centerline.length];
  let ext = 0;
  for (const p of outer) ext = Math.max(ext, Math.abs(p[0]), Math.abs(p[1]));
  return {
    name,
    walls: [...ringToWalls(outer), ...ringToWalls(inner)],
    start: { x: start[0], y: start[1], heading: Math.atan2(next[1] - start[1], next[0] - start[0]) },
    extent: ext + 0.35,
    width,
    centerline,
    inner,
    outer,
    startLine: { ax: inner[0][0], ay: inner[0][1], bx: outer[0][0], by: outer[0][1] },
  };
}

// The tape doubles as the centerline so laps count. No walls: a line course is just tape on the floor.
function buildLineTrack(line: Point[], lineWidth: number, name: string, crossing?: Crossing): Track {
  const margin = 0.4;
  const xs = line.map((p) => p[0]);
  const ys = line.map((p) => p[1]);
  const [x0, x1] = [Math.min(...xs) - margin, Math.max(...xs) + margin];
  const [y0, y1] = [Math.min(...ys) - margin, Math.max(...ys) + margin];
  const [a, b] = line;
  const heading = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const [nx, ny] = [-Math.sin(heading) * 0.06, Math.cos(heading) * 0.06];
  return {
    name,
    walls: [],
    start: { x: a[0], y: a[1], heading },
    extent: Math.max(-x0, x1, -y0, y1) + 0.25,
    width: lineWidth,
    centerline: line,
    inner: [],
    outer: [],
    startLine: { ax: a[0] - nx, ay: a[1] - ny, bx: a[0] + nx, by: a[1] + ny },
    line: { points: line, width: lineWidth },
    crossing,
  };
}

// Nearest point on a closed polyline: its fractional index [0, n), a continuous progress measure,
// and the distance to it.
export function nearestOnLoop(loop: Point[], x: number, y: number): { f: number; d: number } {
  const n = loop.length;
  let bestD = Infinity;
  let bestF = 0;
  for (let i = 0; i < n; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % n];
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const len2 = ex * ex + ey * ey || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * ex + (y - a[1]) * ey) / len2));
    const d = (x - a[0] - ex * t) ** 2 + (y - a[1] - ey * t) ** 2;
    if (d < bestD) { bestD = d; bestF = i + t; }
  }
  return { f: bestF, d: Math.sqrt(bestD) };
}

export function distToSegment(w: Wall, x: number, y: number): number {
  const ex = w.x2 - w.x1;
  const ey = w.y2 - w.y1;
  const t = Math.max(0, Math.min(1, ((x - w.x1) * ex + (y - w.y1) * ey) / (ex * ex + ey * ey || 1e-9)));
  return Math.hypot(x - w.x1 - ex * t, y - w.y1 - ey * t);
}

// Whether a floor point lies on any tape, looped or open.
export function onTape(track: Track, x: number, y: number): boolean {
  const { line, tape } = track;
  if (line && nearestOnLoop(line.points, x, y).d < line.width / 2) return true;
  return !!tape && tape.segments.some((s) => distToSegment(s, x, y) < tape.width / 2);
}

export function trackFromPreset(key: string): Track {
  const p = TRACK_PRESETS[key] ?? TRACK_PRESETS.oval;
  if ("maze" in p) {
    const { cols, rows, cell, seed } = p.maze;
    return { ...generateMaze(cols, rows, cell, seed), name: p.name };
  }
  if ("lineMaze" in p) {
    const { cols, rows, cell, seed } = p.lineMaze;
    return { ...generateLineMaze(cols, rows, cell, 0.019, seed), name: p.name };
  }
  if ("room" in p) {
    const { w, h, furniture, start } = p.room;
    return { ...generateRoom(w, h, furniture, start), name: p.name };
  }
  if ("line" in p) return buildLineTrack(p.line, p.lineWidth, p.name, p.crossing);
  return buildTrack(p.centerline.map(([x, y]) => [x, y]), p.width, p.name);
}
