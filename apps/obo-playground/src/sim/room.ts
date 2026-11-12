// A room to vacuum: four walls, furniture to bump into, and a floor grid that records where the
// car has cleaned. The task is to clean a share of the open floor before time runs out.

import type { Track, Wall } from "./track";

export interface Furniture {
  x: number;
  y: number;
  hx: number; // half-sizes, metres
  hy: number;
  h: number;
}

export interface CleanGrid {
  x0: number;
  y0: number;
  cell: number;
  cols: number;
  rows: number;
  dirty: Uint8Array; // 1 where there is floor to clean, 0 under furniture
  target: number; // share of the dirty cells to clean, 0..1
  seconds: number;
}

export const CLEAN_RADIUS = 0.06; // about the car's width: the strip it sweeps as it drives
export const CLEAN_AHEAD = 0.032; // the chassis centre sits this far ahead of the axle

export function generateRoom(
  w: number,
  h: number,
  furniture: Furniture[],
  start: Track["start"],
  { cell = 0.025, target = 0.75, seconds = 180 } = {},
): Omit<Track, "name"> {
  const [x0, y0, x1, y1] = [-w / 2, -h / 2, w / 2, h / 2];
  const walls: Wall[] = [
    { x1: x0, y1: y0, x2: x1, y2: y0 },
    { x1: x1, y1: y0, x2: x1, y2: y1 },
    { x1: x1, y1: y1, x2: x0, y2: y1 },
    { x1: x0, y1: y1, x2: x0, y2: y0 },
  ];
  const cols = Math.round(w / cell);
  const rows = Math.round(h / cell);
  const dirty = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = x0 + (c + 0.5) * cell;
      const y = y0 + (r + 0.5) * cell;
      dirty[r * cols + c] = furniture.some((f) => Math.abs(x - f.x) < f.hx && Math.abs(y - f.y) < f.hy) ? 0 : 1;
    }
  }
  return {
    walls,
    furniture,
    wallHeight: 0.1,
    start,
    extent: Math.max(w, h) / 2 + 0.25,
    width: Math.min(w, h),
    centerline: [],
    inner: [],
    outer: [],
    startLine: null,
    clean: { x0, y0, cell, cols, rows, dirty, target, seconds },
  };
}

// Which dirty cells the car has swept. `version` bumps on every change so the floor redraws only then.
export class Coverage {
  readonly cleaned: Uint8Array;
  readonly total: number;
  count = 0;
  version = 0;

  constructor(readonly grid: CleanGrid) {
    this.cleaned = new Uint8Array(grid.dirty.length);
    this.total = grid.dirty.reduce((a, b) => a + b, 0);
  }

  get fraction() {
    return this.total ? this.count / this.total : 0;
  }

  reset() {
    this.cleaned.fill(0);
    this.count = 0;
    this.version++;
  }

  sweep(x: number, y: number) {
    const { x0, y0, cell, cols, rows, dirty } = this.grid;
    const reach = Math.ceil(CLEAN_RADIUS / cell);
    const cc = Math.floor((x - x0) / cell);
    const cr = Math.floor((y - y0) / cell);
    for (let r = Math.max(0, cr - reach); r <= Math.min(rows - 1, cr + reach); r++) {
      for (let c = Math.max(0, cc - reach); c <= Math.min(cols - 1, cc + reach); c++) {
        const i = r * cols + c;
        if (!dirty[i] || this.cleaned[i]) continue;
        if (Math.hypot(x0 + (c + 0.5) * cell - x, y0 + (r + 0.5) * cell - y) > CLEAN_RADIUS) continue;
        this.cleaned[i] = 1;
        this.count++;
        this.version++;
      }
    }
  }
}
