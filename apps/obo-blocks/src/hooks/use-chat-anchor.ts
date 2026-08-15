import { useState, useCallback, useEffect, useMemo, useRef } from "react";

/** Rendered size of the avatar, in px. */
export const AVATAR_SIZE = 88;

/** Breathing room between the avatar and the panel it unfolds into. */
const GAP = 14;
/** Keeps the panel from touching the viewport edge. */
const MARGIN = 8;
/** Pointer travel still counted as a click rather than a drag. */
const TAP_SLOP = 5;

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

export interface PanelPlacement {
  x: number;
  y: number;
  /** transform-origin in panel-local px, aimed at the avatar. */
  originX: number;
  originY: number;
  side: "left" | "right";
  vertical: "up" | "down";
}

/**
 * Owns the avatar's position and derives where the chat panel should unfold.
 *
 * The avatar is the anchor: the panel has no position of its own, it is always
 * placed relative to the character and always opens toward the middle of the
 * screen, so an avatar parked in any corner still has room for its panel.
 */
export function useChatAnchor(panelWidth: number, panelHeight: number) {
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [avatarPos, setAvatarPos] = useState({ x: -1, y: -1 });
  const [isDragging, setIsDragging] = useState(false);

  // Read inside pointer handlers, which outlive the render that created them.
  const avatarPosRef = useRef(avatarPos);
  const viewportRef = useRef(viewport);
  avatarPosRef.current = avatarPos;
  viewportRef.current = viewport;

  // Track the viewport and keep the avatar inside it as the window changes.
  useEffect(() => {
    const sync = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setViewport({ w, h });
      setAvatarPos((prev) =>
        prev.x < 0
          ? { x: w - AVATAR_SIZE - 24, y: h - AVATAR_SIZE - 24 } // first paint: bottom-right
          : {
              x: clamp(prev.x, 0, Math.max(0, w - AVATAR_SIZE)),
              y: clamp(prev.y, 0, Math.max(0, h - AVATAR_SIZE)),
            }
      );
    };

    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  const placement = useMemo<PanelPlacement>(() => {
    const cx = avatarPos.x + AVATAR_SIZE / 2;
    const cy = avatarPos.y + AVATAR_SIZE / 2;

    // Unfold toward screen centre: an avatar on the right half opens leftward,
    // one on the bottom half opens upward. In a corner both apply, which is
    // what keeps a cornered avatar's panel pointing inward.
    const side: "left" | "right" = cx > viewport.w / 2 ? "left" : "right";
    const vertical: "up" | "down" = cy > viewport.h / 2 ? "up" : "down";

    const rawX =
      side === "left" ? avatarPos.x - GAP - panelWidth : avatarPos.x + AVATAR_SIZE + GAP;
    // Align the panel edge with the avatar rather than centring it, so the two
    // read as one object hinged at the character.
    const rawY = vertical === "up" ? avatarPos.y + AVATAR_SIZE - panelHeight : avatarPos.y;

    const x = clamp(rawX, MARGIN, Math.max(MARGIN, viewport.w - panelWidth - MARGIN));
    const y = clamp(rawY, MARGIN, Math.max(MARGIN, viewport.h - panelHeight - MARGIN));

    return {
      x,
      y,
      // Follows the avatar even after clamping, so the panel always looks like
      // it grew out of the character and not out of a fixed corner.
      originX: clamp(cx - x, 0, panelWidth),
      originY: clamp(cy - y, 0, panelHeight),
      side,
      vertical,
    };
  }, [avatarPos, viewport, panelWidth, panelHeight]);

  /**
   * Pointer-driven drag of the anchor. Works from the avatar itself or from the
   * panel header — both move the same anchor, so the assembly travels together.
   *
   * `onTap` fires when the pointer barely moved, which is how the avatar tells
   * a click (toggle the panel) from a drag (reposition it).
   */
  const startDrag = useCallback((e: React.PointerEvent, onTap?: () => void) => {
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture?.(e.pointerId);

    const startX = e.clientX;
    const startY = e.clientY;
    const offsetX = e.clientX - avatarPosRef.current.x;
    const offsetY = e.clientY - avatarPosRef.current.y;
    let travelled = 0;

    const handleMove = (ev: PointerEvent) => {
      travelled = Math.max(travelled, Math.hypot(ev.clientX - startX, ev.clientY - startY));
      if (travelled <= TAP_SLOP) return; // still could be a click; don't jitter

      setIsDragging(true);
      const { w, h } = viewportRef.current;
      setAvatarPos({
        x: clamp(ev.clientX - offsetX, 0, Math.max(0, w - AVATAR_SIZE)),
        y: clamp(ev.clientY - offsetY, 0, Math.max(0, h - AVATAR_SIZE)),
      });
    };

    const handleEnd = (ev: PointerEvent) => {
      el.releasePointerCapture?.(ev.pointerId);
      el.removeEventListener("pointermove", handleMove);
      el.removeEventListener("pointerup", handleEnd);
      el.removeEventListener("pointercancel", handleEnd);
      setIsDragging(false);
      if (travelled <= TAP_SLOP) onTap?.();
    };

    el.addEventListener("pointermove", handleMove);
    el.addEventListener("pointerup", handleEnd);
    el.addEventListener("pointercancel", handleEnd);
  }, []);

  return { avatarPos, isDragging, startDrag, placement, ready: viewport.w > 0 };
}
