// Micromouse-style perfect maze (one path between any two cells), carved with a seeded
// recursive backtracker. Start in the (0,0) corner, goal in the centre cell.

import type { Point, Track, Wall } from "./track";

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Side = "N" | "E" | "S" | "W";
const OPPOSITE: Record<Side, Side> = { N: "S", E: "W", S: "N", W: "E" };

export function generateMaze(cols: number, rows: number, cell: number, seed = 1): Omit<Track, "name"> {
  const rnd = mulberry32(seed);
  const idx = (c: number, r: number) => r * cols + c;
  const visited = new Array<boolean>(cols * rows).fill(false);
  const open = Array.from({ length: cols * rows }, () => ({ N: false, E: false, S: false, W: false }));

  const stack: Point[] = [[0, 0]];
  visited[idx(0, 0)] = true;
  while (stack.length) {
    const [c, r] = stack[stack.length - 1];
    const nbrs: [Side, number, number][] = [];
    if (r < rows - 1 && !visited[idx(c, r + 1)]) nbrs.push(["N", c, r + 1]);
    if (c < cols - 1 && !visited[idx(c + 1, r)]) nbrs.push(["E", c + 1, r]);
    if (r > 0 && !visited[idx(c, r - 1)]) nbrs.push(["S", c, r - 1]);
    if (c > 0 && !visited[idx(c - 1, r)]) nbrs.push(["W", c - 1, r]);
    if (!nbrs.length) { stack.pop(); continue; }
    const [dir, nc, nr] = nbrs[Math.floor(rnd() * nbrs.length)];
    open[idx(c, r)][dir] = true;
    open[idx(nc, nr)][OPPOSITE[dir]] = true;
    visited[idx(nc, nr)] = true;
    stack.push([nc, nr]);
  }

  // Centre the maze on the origin. Each cell owns its E and N walls; W/S only on the boundary.
  const W = cols * cell;
  const H = rows * cell;
  const x0 = -W / 2;
  const y0 = -H / 2;
  const cellCenter = (c: number, r: number): Point => [x0 + (c + 0.5) * cell, y0 + (r + 0.5) * cell];
  const walls: Wall[] = [];
  const seg = (x1: number, y1: number, x2: number, y2: number) => walls.push({ x1, y1, x2, y2 });
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const o = open[idx(c, r)];
      const lx = x0 + c * cell;
      const rx = x0 + (c + 1) * cell;
      const by = y0 + r * cell;
      const ty = y0 + (r + 1) * cell;
      if (!o.E) seg(rx, by, rx, ty);
      if (!o.N) seg(lx, ty, rx, ty);
      if (c === 0 && !o.W) seg(lx, by, lx, ty);
      if (r === 0 && !o.S) seg(lx, by, rx, by);
    }
  }

  const posts: Point[] = [];
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) posts.push([x0 + c * cell, y0 + r * cell]);
  }

  const sc = cellCenter(0, 0);
  const gc = cellCenter(Math.floor(cols / 2), Math.floor(rows / 2));
  return {
    walls,
    posts,
    wallHeight: 0.1,
    start: { x: sc[0], y: sc[1], heading: open[idx(0, 0)].N ? Math.PI / 2 : 0 },
    goal: { x: gc[0], y: gc[1], r: cell * 0.5 },
    extent: Math.max(W, H) / 2 + 0.25,
    width: cell,
    cell,
    centerline: [],
    inner: [],
    outer: [],
    startLine: null,
  };
}
