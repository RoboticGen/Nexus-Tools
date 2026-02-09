"use client";

import { useMemo } from "react";

interface TurtleWorkspaceProps {
  background: string;
  onBackgroundChange: (bg: string) => void;
}

const BACKGROUNDS: Record<string, string | null> = {
  "No-Background": null,
  maze: "/images/maze.png",
};

export function TurtleWorkspace({
  background,
  onBackgroundChange,
}: TurtleWorkspaceProps) {
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
    <div className="turtle-panel">
      <div className="panel-header">
        <span className="panel-title">Turtle Workspace</span>
        <div className="button-group">
          <select
            className="background-select"
            value={background}
            onChange={(e) => onBackgroundChange(e.target.value)}
          >
            {Object.keys(BACKGROUNDS).map((bg) => (
              <option key={bg} value={bg}>
                {bg === "No-Background" ? "No Background" : bg}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div id="turtle-canvas" className="turtle-canvas" style={backgroundStyle}>
        {/* Skulpt will render the turtle canvas here */}
      </div>
    </div>
  );
}
