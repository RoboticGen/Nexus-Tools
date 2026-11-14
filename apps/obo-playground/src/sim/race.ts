// Lap counting by progress along the centerline (any racing line counts), reaching the maze
// goal, or cleaning enough of a room in time. Times are simulated milliseconds.

import { CLEAN_AHEAD, Coverage } from "./room";
import { nearestOnLoop, type Track } from "./track";

export type RaceEvent = "lap" | "finish" | "timeout" | null;

export class Race {
  readonly isMaze: boolean;
  readonly totalLaps: number;
  readonly coverage: Coverage | null;
  best: number | null = null;
  lap = 0;
  elapsed = 0;
  finished = false;
  started = false;
  private timed = true;
  private progress = 0;
  private lapStartProgress = 0;
  private prevF: number | null = null;
  private lapStart = 0;

  constructor(private track: Track, totalLaps = 3) {
    this.isMaze = !!track.goal;
    this.coverage = track.clean ? new Coverage(track.clean) : null;
    this.totalLaps = this.isMaze || this.coverage ? 1 : totalLaps;
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
    this.coverage?.reset();
  }

  // Driving by hand isn't timed: the room's clock only limits a program.
  start(now: number, timed = true) {
    this.reset();
    this.started = true;
    this.timed = timed;
    this.lap = this.isMaze || this.coverage ? 0 : 1;
    this.lapStart = now;
  }

  update(pose: { x: number; y: number; theta?: number }, now: number): RaceEvent {
    if (!this.started || this.finished) return null;
    this.elapsed = (now - this.lapStart) / 1000;

    const { coverage } = this;
    if (coverage) {
      const a = pose.theta ?? 0;
      coverage.sweep(pose.x + Math.cos(a) * CLEAN_AHEAD, pose.y + Math.sin(a) * CLEAN_AHEAD);
      if (coverage.fraction >= coverage.grid.target) {
        this.finished = true;
        this.lap = 1;
        this.best = this.best === null ? this.elapsed : Math.min(this.best, this.elapsed);
        return "finish";
      }
      if (!this.timed || this.elapsed < coverage.grid.seconds) return null;
      this.finished = true;
      return "timeout";
    }

    const goal = this.track.goal;
    if (goal) {
      if (Math.hypot(pose.x - goal.x, pose.y - goal.y) > goal.r) return null;
      this.finished = true;
      this.lap = 1;
      this.best = this.best === null ? this.elapsed : Math.min(this.best, this.elapsed);
      return "finish";
    }

    const n = this.track.centerline.length;
    if (n < 2) return null; // no loop to lap: otherwise every update would count as a lap
    const { f } = nearestOnLoop(this.track.centerline, pose.x, pose.y);
    if (this.prevF === null) { this.prevF = f; return null; }
    // shortest signed step across the loop seam
    let d = f - this.prevF;
    if (d > n / 2) d -= n;
    else if (d < -n / 2) d += n;
    // Where a loop crosses itself the nearest point can flip to the other branch, half a loop away.
    // The car moves millimetres per update, so skip such jumps until it is clearly back on its branch.
    if (Math.abs(d) > Math.max(1, n / 8)) return null;
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
