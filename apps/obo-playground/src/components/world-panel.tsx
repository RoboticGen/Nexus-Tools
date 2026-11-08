"use client";

import { Alert, AlertDescription, AlertTitle } from "@nexus-tools/design-system/components/ui/alert";
import { Badge } from "@nexus-tools/design-system/components/ui/badge";
import { Button } from "@nexus-tools/design-system/components/ui/button";
import { Panel } from "@nexus-tools/design-system/components/ui/panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@nexus-tools/design-system/components/ui/select";
import { Spinner } from "@nexus-tools/design-system/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@nexus-tools/design-system/components/ui/toggle-group";
import { ToolbarSeparator } from "@nexus-tools/design-system/components/ui/toolbar";
import { Joystick, Play, Puzzle, RotateCcw, Square } from "lucide-react";

import { WorldScene, type CameraView, type SceneColors } from "@/scene/world-scene";
import { TRACK_PRESETS, type Track } from "@/sim/track";

import type { Mode, PlaygroundSim, Snapshot } from "@/sim/playground-sim";

const ENGINE_BADGE = {
  loading: { tone: "info", label: "Loading physics" },
  ready: { tone: "success", label: "MuJoCo ready" },
  error: { tone: "danger", label: "Physics failed" },
} as const;

export function WorldPanel({
  sim,
  snap,
  track,
  trackKey,
  view,
  colors,
  onRun,
  onTrackChange,
  onViewChange,
}: {
  sim: PlaygroundSim | null;
  snap: Snapshot | null;
  track: Track;
  trackKey: string;
  view: { name: CameraView; nonce: number };
  colors: SceneColors;
  onRun: () => void;
  onTrackChange: (key: string) => void;
  onViewChange: (name: CameraView) => void;
}) {
  const engine = snap?.engine ?? "loading";
  const badge = ENGINE_BADGE[engine];
  return (
    <Panel
      title="World"
      toolbarLabel="Simulation controls"
      className="h-full"
      actions={
        <>
          <Button size="sm" onClick={onRun} disabled={engine !== "ready"}>
            {snap?.running ? <Square aria-hidden="true" /> : <Play aria-hidden="true" />}
            {snap?.running ? "Stop" : "Run"}
          </Button>
          <Button size="icon-sm" variant="outline" aria-label="Reset robot" title="Reset robot" onClick={() => sim?.resetCar()}>
            <RotateCcw aria-hidden="true" />
          </Button>
          <ToolbarSeparator />
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={snap?.mode ?? "program"}
            onValueChange={(v) => v && sim?.setMode(v as Mode)}
            aria-label="Driving mode"
          >
            <ToggleGroupItem value="program" title="Drive with your blocks">
              <Puzzle aria-hidden="true" />
              Program
            </ToggleGroupItem>
            <ToggleGroupItem value="manual" title="Drive with the arrow keys">
              <Joystick aria-hidden="true" />
              Manual
            </ToggleGroupItem>
          </ToggleGroup>
          <Select value={trackKey} onValueChange={onTrackChange}>
            <SelectTrigger size="sm" aria-label="Track" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TRACK_PRESETS).map(([key, p]) => (
                <SelectItem key={key} value={key}>
                  {p.name}
                </SelectItem>
              ))}
              {trackKey === "custom" && <SelectItem value="custom">Custom track</SelectItem>}
            </SelectContent>
          </Select>
          {/* Clicking the active view again resets it, so the empty value still reframes. */}
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={view.name}
            onValueChange={(v) => onViewChange((v || view.name) as CameraView)}
            aria-label="Camera view (keys 1 and 2)"
          >
            <ToggleGroupItem value="chase" title="Chase view (1)">
              Chase
            </ToggleGroupItem>
            <ToggleGroupItem value="top" title="Top view (2)">
              Top
            </ToggleGroupItem>
          </ToggleGroup>
          <Badge tone={badge.tone} appearance="dot">
            {badge.label}
          </Badge>
        </>
      }
    >
      <div className="relative h-full min-h-0">
        {sim && <WorldScene sim={sim} track={track} view={view} colors={colors} />}

        <div className="pointer-events-none absolute top-2 left-2 flex flex-wrap gap-1.5">
          <Badge variant="secondary">{snap?.isMaze ? (snap.finished ? "Goal reached" : "Find the goal") : `Lap ${snap?.lap ?? 0}/${snap?.totalLaps ?? 3}`}</Badge>
          <Badge variant="secondary" className="font-mono tabular-nums">{(snap?.elapsed ?? 0).toFixed(2)}s</Badge>
          <Badge variant="secondary" className="font-mono tabular-nums">Best {snap?.best ? `${snap.best.toFixed(2)}s` : "-"}</Badge>
          <Badge variant="secondary" className="font-mono tabular-nums">{Math.round((snap?.speed ?? 0) * 100)} cm/s</Badge>
        </div>
        {snap?.mode === "manual" && (
          <p className="bg-card/80 text-muted-foreground pointer-events-none absolute bottom-2 left-2 rounded-md px-2 py-1 text-xs">
            Manual: drive with the arrow keys
          </p>
        )}

        {snap?.countdown && (
          <div
            aria-live="assertive"
            className="text-foreground pointer-events-none absolute inset-0 flex items-center justify-center text-7xl font-bold drop-shadow"
          >
            {snap.countdown}
          </div>
        )}
        {engine === "loading" && (
          <div className="bg-background/60 absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Spinner />
            <p className="text-muted-foreground text-sm">Loading the physics engine…</p>
          </div>
        )}
        {engine === "error" && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <Alert tone="danger" className="max-w-md">
              <AlertTitle>Could not load the physics engine</AlertTitle>
              <AlertDescription>Reload the page to try again.</AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </Panel>
  );
}
