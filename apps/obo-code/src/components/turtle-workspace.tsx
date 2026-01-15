"use client";

export function TurtleWorkspace() {
  return (
    <div className="turtle-panel">
      <div className="panel-header">
        <span className="panel-title">Turtle Workspace</span>
      </div>
      <div id="turtle-canvas" className="turtle-canvas">
        {/* Skulpt will render the turtle canvas here */}
      </div>
    </div>
  );
}
