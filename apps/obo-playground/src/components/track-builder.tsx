"use client";

import { Button } from "@nexus-tools/design-system/components/ui/button";
import { Label } from "@nexus-tools/design-system/components/ui/label";
import { Check, Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";

import { buildTrack, type Point, type Track } from "@/sim/track";

import type { SceneColors } from "@/scene/world-scene";

const HIT_PX = 10;

// Top-down editor for a corridor track's centerline: drag the dots, set the width, Apply.
export function TrackBuilder({
  track,
  colors,
  onApply,
}: {
  track: Track;
  colors: SceneColors;
  onApply: (track: Track) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState<Track | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [width, setWidth] = useState(0.5);
  const [hover, setHover] = useState(-1);
  const dragIndex = useRef(-1);
  const scale = useRef(8); // px per metre

  // Load each new corridor track; the maze and line track aren't, so keep the last corridor instead.
  const disabled = !!track.goal || !!track.line;
  if (track !== loaded && !disabled) {
    setLoaded(track);
    setPoints(track.centerline.map(([x, y]) => [x, y]));
    setWidth(track.width);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || points.length < 3) return;
    const W = canvas.width;
    const H = canvas.height;
    // Refit only between drags, so the view doesn't shift under the pointer mid-drag.
    if (dragIndex.current < 0) {
      let ext = 0.7;
      for (const [x, y] of points) ext = Math.max(ext, Math.abs(x), Math.abs(y));
      scale.current = Math.min(W, H) / (2 * (ext + width));
    }
    const toScreen = ([x, y]: Point): Point => [W / 2 + x * scale.current, H / 2 - y * scale.current];

    ctx.fillStyle = colors.floor;
    ctx.fillRect(0, 0, W, H);
    const preview = buildTrack(points, width);
    const ring = (pts: Point[]) => {
      ctx.beginPath();
      pts.forEach((p, i) => {
        const [sx, sy] = toScreen(p);
        if (i) ctx.lineTo(sx, sy);
        else ctx.moveTo(sx, sy);
      });
      ctx.closePath();
      ctx.stroke();
    };
    ctx.strokeStyle = colors.wall;
    ctx.lineWidth = 2;
    ring(preview.inner);
    ring(preview.outer);
    ctx.strokeStyle = colors.rayClear;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ring(points);
    ctx.setLineDash([]);

    const [s0x, s0y] = toScreen(points[0]);
    ctx.fillStyle = colors.nose;
    ctx.beginPath();
    ctx.arc(s0x, s0y, 7, 0, Math.PI * 2);
    ctx.fill();
    points.forEach((p, i) => {
      const [sx, sy] = toScreen(p);
      ctx.fillStyle = i === hover ? colors.goal : colors.post;
      ctx.beginPath();
      ctx.arc(sx, sy, i === hover ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [points, width, hover, colors]);

  const canvasPos = (e: PointerEvent<HTMLCanvasElement>): Point => {
    const c = e.currentTarget;
    const r = c.getBoundingClientRect();
    return [(e.clientX - r.left) * (c.width / r.width), (e.clientY - r.top) * (c.height / r.height)];
  };
  const hitTest = ([sx, sy]: Point) => {
    const c = canvasRef.current!;
    return points.findIndex(
      ([x, y]) => Math.hypot(c.width / 2 + x * scale.current - sx, c.height / 2 - y * scale.current - sy) < HIT_PX,
    );
  };

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    const i = hitTest(canvasPos(e));
    if (i < 0) return;
    dragIndex.current = i;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const [sx, sy] = canvasPos(e);
    const i = dragIndex.current;
    if (i < 0) {
      setHover(hitTest([sx, sy]));
      return;
    }
    const c = e.currentTarget;
    const p: Point = [(sx - c.width / 2) / scale.current, -(sy - c.height / 2) / scale.current];
    setPoints((pts) => pts.map((q, j) => (j === i ? p : q)));
  };
  const onPointerUp = () => {
    dragIndex.current = -1;
    setPoints((pts) => [...pts]); // redraw once more so the view refits
  };

  // insert a point at the longest gap so the shape stays sensible
  const addPoint = () =>
    setPoints((pts) => {
      let best = 0;
      let bestLen = -1;
      pts.forEach((a, i) => {
        const b = pts[(i + 1) % pts.length];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len > bestLen) { bestLen = len; best = i; }
      });
      const a = pts[best];
      const b = pts[(best + 1) % pts.length];
      return [...pts.slice(0, best + 1), [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], ...pts.slice(best + 1)];
    });

  return (
    <div className="flex flex-col gap-3">
      {disabled && (
        <p className="text-muted-foreground text-sm">
          {track.goal ? "The maze" : "The line track"} can&apos;t be edited. Pick a racing track to edit it.
        </p>
      )}
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        aria-label="Track editor: drag the dots to reshape the track"
        className="border-border aspect-square w-full touch-none rounded-md border"
        style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? "none" : undefined }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => setHover(-1)}
      />
      <div className="flex items-center gap-3">
        <Label htmlFor="track-width" className="shrink-0">
          Width
        </Label>
        <input
          id="track-width"
          type="range"
          min={0.3}
          max={0.8}
          step={0.025}
          value={width}
          disabled={disabled}
          onChange={(e) => setWidth(Number(e.target.value))}
          className="accent-primary w-full"
        />
        <span className="text-muted-foreground w-14 text-right font-mono text-xs whitespace-nowrap tabular-nums">{Math.round(width * 100)} cm</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={addPoint} disabled={disabled}>
          <Plus aria-hidden="true" />
          Point
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setPoints((pts) => (pts.length > 4 ? pts.slice(0, -1) : pts))}
          disabled={disabled}
        >
          <Minus aria-hidden="true" />
          Point
        </Button>
        <Button size="sm" className="ml-auto" onClick={() => onApply(buildTrack(points, width))} disabled={disabled}>
          <Check aria-hidden="true" />
          Apply
        </Button>
      </div>
    </div>
  );
}
