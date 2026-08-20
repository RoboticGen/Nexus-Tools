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
        Brython injects raw <svg>/<canvas> into this node at runtime, outside
        React — hence the arbitrary-variant centring rather than styling a
        child component. The `id` is Brython's mount target: don't rename it.
      */}
      <div
        id="turtle-canvas"
        style={backgroundStyle}
        className="relative min-h-0 w-full flex-1 overflow-auto [&_canvas]:mx-auto [&_canvas]:block [&_svg]:mx-auto [&_svg]:block"
      />
    </TurtlePanel>
  );
}
