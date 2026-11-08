"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@nexus-tools/design-system/components/ui/card";
import { cn } from "@nexus-tools/design-system/lib/utils";

import { LINE_SITES, NEAR_WALL, SENSOR_RANGE, TOP_SPEED } from "@/sim/mujoco-world";

import { TrackBuilder } from "./track-builder";

import type { SceneColors } from "@/scene/world-scene";
import type { Snapshot } from "@/sim/playground-sim";
import type { Track } from "@/sim/track";

const BAR_FULL_SCALE_M = 1; // bars fill at 1 m; the number shows the real reading

function Row({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-muted-foreground w-14 shrink-0">{label}</span>
      <div className="bg-muted relative h-2 flex-1 overflow-hidden rounded-full">{children}</div>
      <span className="w-24 shrink-0 text-right font-mono text-xs whitespace-nowrap tabular-nums">{value}</span>
    </div>
  );
}

function SignedBar({ value }: { value: number }) {
  const v = Math.max(-1, Math.min(1, value || 0));
  const pct = Math.abs(v) * 50;
  return (
    <>
      <div className="bg-border absolute inset-y-0 left-1/2 w-px" />
      <div
        className={cn("absolute inset-y-0 rounded-full", v >= 0 ? "bg-tone-brand" : "bg-tone-warning")}
        style={{ left: `${v >= 0 ? 50 : 50 - pct}%`, width: `${pct}%` }}
      />
    </>
  );
}

function Fill({ fraction, className }: { fraction: number; className: string }) {
  return (
    <div
      className={cn("absolute inset-y-0 left-0 rounded-full", className)}
      style={{ width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }}
    />
  );
}

export function Dashboard({
  snap,
  track,
  colors,
  onApplyTrack,
}: {
  snap: Snapshot | null;
  track: Track;
  colors: SceneColors;
  onApplyTrack: (track: Track) => void;
}) {
  const sensors = snap?.sensors ?? { front: SENSOR_RANGE, left: SENSOR_RANGE, right: SENSOR_RANGE };
  return (
    // -m-px p-px: the cards' outline is a 1px ring outside their box, which overflow-y-auto would clip.
    // Cards don't shrink, so a short column scrolls instead of cutting their content off; the last one
    // grows, so in a tall window the column ends level with the panels beside it.
    <div className="-m-px flex h-full flex-col gap-2 overflow-y-auto p-px [&>*]:shrink-0 [&>*:last-child]:grow">
      <Card size="sm">
        <CardHeader>
          <CardTitle>Distance sensors</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {(["front", "left", "right"] as const).map((dir) => {
            const d = sensors[dir];
            return (
              <Row key={dir} label={dir[0].toUpperCase() + dir.slice(1)} value={d >= SENSOR_RANGE ? "—" : `${(d * 100).toFixed(1)} cm`}>
                <Fill fraction={d / BAR_FULL_SCALE_M} className={d < NEAR_WALL ? "bg-tone-danger" : "bg-tone-success"} />
              </Row>
            );
          })}
        </CardContent>
      </Card>

      {track.line && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>Line sensors</CardTitle>
          </CardHeader>
          <CardContent>
            <ol aria-label="Line sensors, left to right" className="flex justify-between">
              {(snap?.lineSensors ?? LINE_SITES.map(() => 0)).map((on, i) => (
                <li key={i} className="flex flex-col items-center gap-1">
                  <span className={cn("size-4 rounded-full border-2", on ? "bg-foreground border-foreground" : "border-border")} />
                  <span className="text-muted-foreground font-mono text-xs">{i}</span>
                  <span className="sr-only">{on ? "on the line" : "off the line"}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <Card size="sm">
        <CardHeader>
          <CardTitle>Motion</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Row label="Speed" value={`${((snap?.speed ?? 0) * 100).toFixed(1)} cm/s`}>
            <Fill fraction={(snap?.speed ?? 0) / TOP_SPEED} className="bg-tone-brand" />
          </Row>
          {/* positive = turning right, the same sign as the drive block's turn */}
          <Row label="Turning" value={`${(-(snap?.omega ?? 0)).toFixed(2)} rad/s`}>
            <SignedBar value={-(snap?.omega ?? 0) / 8} />
          </Row>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Motors</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Row label="Left" value={(snap?.motorL ?? 0).toFixed(2)}>
            <SignedBar value={snap?.motorL ?? 0} />
          </Row>
          <Row label="Right" value={(snap?.motorR ?? 0).toFixed(2)}>
            <SignedBar value={snap?.motorR ?? 0} />
          </Row>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Track builder</CardTitle>
        </CardHeader>
        <CardContent>
          <TrackBuilder track={track} colors={colors} onApply={onApplyTrack} />
        </CardContent>
      </Card>
    </div>
  );
}
