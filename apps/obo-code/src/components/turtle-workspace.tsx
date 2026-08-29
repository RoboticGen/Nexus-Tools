"use client";

import { TurtlePanel } from "@nexus-tools/design-system/components/ui/turtle-panel";
import { useMemo } from "react";

interface TurtleWorkspaceProps {
  background: string;
  onBackgroundChange: (bg: string) => void;
}

const BACKGROUNDS: Record<string, string | null> = {
  "No-Background": null,
  maze: "/images/maze.png",
};

const BACKGROUND_OPTIONS = [
  { id: "No-Background", label: "No Background" },
  { id: "maze", label: "Maze" },
];

export function TurtleWorkspace({ background, onBackgroundChange }: TurtleWorkspaceProps) {
  const backgroundStyle = useMemo(() => {
    const bgImage = BACKGROUNDS[background];
    if (!bgImage) return {};
    return {
      backgroundImage: `url(${bgImage})`,
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundSize: "contain",
    };
  }, [background]);

  return (
    <TurtlePanel
      title="Turtle Workspace"
      backgrounds={BACKGROUND_OPTIONS}
      activeBackground={background}
      onBackgroundChange={onBackgroundChange}
    >
      {/*
        Skulpt's turtle graphics injects raw <canvas>/<svg> layers into this
        node at runtime, outside React — hence the arbitrary-variant centring
        rather than styling a child component. The `id` is Skulpt's mount
        target (`Sk.TurtleGraphics.target`): don't rename it.

        Skulpt positions the drawing canvas itself (inline `left`/`top`, from
        its own — stale — read of this container's size), while the cursor
        layer stays in normal flow. That's why plain centring utilities only
        ever moved one of the two: an inline style beats a stylesheet rule of
        equal or lower priority, `grid`/`flex` placement doesn't apply to a
        `position: absolute` element at all, and the drawing is exactly the
        element Skulpt has opinions about. `!` forces our rule to `!important`,
        which is the one thing that outranks a plain inline style, so both
        layers are forced into the same `absolute` + `inset-0` + `m-auto`
        centring regardless of what Skulpt tried to set — restoring the
        overlay and the centring together.
      */}
      <div
        id="turtle-canvas"
        style={backgroundStyle}
        className="relative min-h-0 w-full flex-1 overflow-auto [&>canvas]:absolute! [&>canvas]:inset-0! [&>canvas]:m-auto! [&>svg]:absolute! [&>svg]:inset-0! [&>svg]:m-auto!"
      />
    </TurtlePanel>
  );
}
