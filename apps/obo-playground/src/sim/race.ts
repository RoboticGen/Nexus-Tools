// Lap counting by progress along the centerline (any racing line counts), or reaching the
// maze goal. Times are simulated milliseconds.

import type { Point, Track } from "./track";

// Fractional centerline index [0, n) of the nearest point: a continuous progress measure.
function projectFraction(centerline: Point[], x: number, y: number): number {
  const n = centerline.length;
  let bestD = Infinity;
  let bestF = 0;
  for (let i = 0; i < n; i++) {
    const a = centerline[i];
    const b = centerline[(i + 1) % n];
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const len2 = ex * ex + ey * ey || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * ex + (y - a[1]) * ey) / len2));
    const d = (x - a[0] - ex * t) ** 2 + (y - a[1] - ey * t) ** 2;
    if (d < bestD) { bestD = d; bestF = i + t; }
  }
  return bestF;
}

export type RaceEvent = "lap" | "finish" | null;

export class Race {
  readonly isMaze: boolean;
  readonly totalLaps: number;
  best: number | null = null;
  lap = 0;
  elapsed = 0;
  finished = false;
  started = false;
  private progress = 0;
  private lapStartProgress = 0;
  private prevF: number | null = null;
  private lapStart = 0;

  constructor(private track: Track, totalLaps = 3) {
    this.isMaze = !!track.goal;
    this.totalLaps = this.isMaze ? 1 : totalLaps;
  }

  reset() {
    this.progress = 0;
    this.lapStartProgress = 0;
    this.prevF = null;
    this.lap = 0;
    this.lapStart = 0;
    this.elapsed = 0;
    this.finished = false;
    this.started = false;
  }

  start(now: number) {
    this.reset();
    this.started = true;
    this.lap = this.isMaze ? 0 : 1;
    this.lapStart = now;
  }

  update(pose: { x: number; y: number }, now: number): RaceEvent {
    if (!this.started || this.finished) return null;
    this.elapsed = (now - this.lapStart) / 1000;

    const goal = this.track.goal;
    if (goal) {
      if (Math.hypot(pose.x - goal.x, pose.y - goal.y) > goal.r) return null;
      this.finished = true;
      this.lap = 1;
      this.best = this.best === null ? this.elapsed : Math.min(this.best, this.elapsed);
      return "finish";
    }

    const n = this.track.centerline.length;
    const f = projectFraction(this.track.centerline, pose.x, pose.y);
    if (this.prevF === null) { this.prevF = f; return null; }
    // shortest signed step across the loop seam
    let d = f - this.prevF;
    if (d > n / 2) d -= n;
    else if (d < -n / 2) d += n;
    this.progress += d;
    this.prevF = f;

    // a full loop in either direction
    if (Math.abs(this.progress - this.lapStartProgress) < n) return null;
    const lapTime = (now - this.lapStart) / 1000;
    if (this.best === null || lapTime < this.best) this.best = lapTime;
    this.lapStartProgress = this.progress;
    this.lapStart = now;
    this.lap += 1;
    if (this.lap > this.totalLaps) {
      this.finished = true;
      this.lap = this.totalLaps;
      return "finish";
    }
    return "lap";
  }
}
