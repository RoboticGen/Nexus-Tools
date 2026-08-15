"use client";

import "./chat-avatar.css";

/**
 * What the companion is reacting to. `thinking` and `typing` are live states
 * driven by the panel; `result`, `accept` and `reject` are momentary reactions
 * that decay back to `idle`.
 */
export type AvatarMood = "idle" | "typing" | "thinking" | "result" | "accept" | "reject";

/**
 * Mood → artwork. Poses come from avatar/annotation.md; `typing` deliberately
 * reuses the attentive idle pose and is told apart by its animation, since the
 * character is listening rather than reacting at that point.
 */
const MOOD_IMAGE: Record<AvatarMood, string> = {
  idle: "/avatar/obo_desperate.webp",
  typing: "/avatar/obo_desperate.webp",
  thinking: "/avatar/obo_desperate_eyesclosed.webp",
  result: "/avatar/obo_desperate_congrats.webp",
  accept: "/avatar/obo_desperate_Hanging.webp",
  reject: "/avatar/obo_desperate_falling.webp",
};

const MOOD_LABEL: Record<AvatarMood, string> = {
  idle: "Obo is listening",
  typing: "Obo is reading along",
  thinking: "Obo is thinking",
  result: "Obo built your blocks",
  accept: "Obo restored that version",
  reject: "Obo reverted the blocks",
};

interface ChatAvatarProps {
  mood: AvatarMood;
  /** Whether the panel is currently open — drives the "pressed in" look. */
  isOpen: boolean;
  isDragging: boolean;
  size: number;
  x: number;
  y: number;
  onPointerDown: (e: React.PointerEvent) => void;
}

export function ChatAvatar({
  mood,
  isOpen,
  isDragging,
  size,
  x,
  y,
  onPointerDown,
}: ChatAvatarProps) {
  return (
    <div
      className={`chat-avatar mood-${mood} ${isOpen ? "is-open" : ""} ${
        isDragging ? "is-dragging" : ""
      }`}
      style={{ left: `${x}px`, top: `${y}px`, width: `${size}px`, height: `${size}px` }}
      onPointerDown={onPointerDown}
      role="button"
      tabIndex={0}
      aria-label={`${MOOD_LABEL[mood]}. Click to ${isOpen ? "collapse" : "open"} the chat.`}
      title={`${MOOD_LABEL[mood]} — click to ${isOpen ? "collapse" : "open"}, drag to move`}
    >
      <span className="chat-avatar-glow" aria-hidden="true" />

      {/*
        Every pose is mounted at once and cross-faded by CSS. Swapping a single
        src would flash on first use of a pose, since webp decode happens after
        the state has already changed.
      */}
      {(Object.keys(MOOD_IMAGE) as AvatarMood[]).map((key) => (
        // next/image wraps each frame in its own container, which breaks the
        // stacked cross-fade; these are small local webp files anyway.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={key}
          className={`chat-avatar-img ${mood === key ? "is-active" : ""}`}
          src={MOOD_IMAGE[key]}
          alt=""
          draggable={false}
          aria-hidden="true"
        />
      ))}

      {/* Thought dots, shown only while the agent is working. */}
      <span className="chat-avatar-thinking" aria-hidden="true">
        <i /><i /><i />
      </span>
    </div>
  );
}
