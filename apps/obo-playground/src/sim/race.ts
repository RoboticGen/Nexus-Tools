// Lap counting by progress along the centerline (any racing line counts), or reaching the
// maze goal. Times are simulated milliseconds.

import { nearestOnLoop, type Track } from "./track";

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
    const { f } = nearestOnLoop(this.track.centerline, pose.x, pose.y);
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
