// A track is a centerline polyline + corridor width turned into wall segments, or a maze.
// Physics and rendering both read this one description. Coordinates: x/y on the ground, metres,
// sized for the real 12 cm OBO Car (a classroom floor, not a racetrack).

import { generateMaze } from "./maze";

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

type Preset =
  | { name: string; width: number; centerline: Point[] }
  | { name: string; maze: { cols: number; rows: number; cell: number; seed: number } };

export const TRACK_PRESETS: Record<string, Preset> = {
  oval: { name: "Speedway Oval", width: 0.5, centerline: sampleStadium(1.0, 0.75, 32) },
  clover: { name: "Clover Loop", width: 0.5, centerline: sampleClover(1.25, 0.3, 54) },
  slalom: { name: "Slalom Loop", width: 0.5, centerline: sampleSerpentine(1.25, 0.75, 0.28, 3, 60) },
  maze: { name: "Micromouse Maze", maze: { cols: 7, rows: 7, cell: 0.3, seed: 7 } },
};

function norm(x: number, y: number): Point {
  const m = Math.hypot(x, y) || 1;
  return [x / m, y / m];
}

// Offset a closed centerline by half the width using averaged vertex normals (smooth corners).
function offsetWalls(centerline: Point[], width: number) {
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
  const { inner, outer } = offsetWalls(centerline, width);
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

export function trackFromPreset(key: string): Track {
  const p = TRACK_PRESETS[key] ?? TRACK_PRESETS.oval;
  if ("maze" in p) {
    const { cols, rows, cell, seed } = p.maze;
    return { ...generateMaze(cols, rows, cell, seed), name: p.name };
  }
  return buildTrack(p.centerline.map(([x, y]) => [x, y]), p.width, p.name);
}
