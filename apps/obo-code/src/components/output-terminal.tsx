"use client";

interface OutputTerminalProps {
  output: string;
  onClear: () => void;
  onStop: () => void;
  isRunning: boolean;
}

export function OutputTerminal({
  output,
  onClear,
  onStop,
  isRunning,
}: OutputTerminalProps) {
  return (
    <div className="output-panel">
      <div className="panel-header">
        <span className="panel-title">Output</span>
        <div className="button-group">
          <button className="action-btn clear-btn" onClick={onClear}>
            <i className="fa fa-trash" />
            <span>Clear</span>
          </button>
          <button
            className={`action-btn stop-btn ${isRunning ? "active" : ""}`}
            onClick={onStop}
          >
            <i className="fa fa-stop" />
            <span>Stop</span>
          </button>
        </div>
      </div>
      <div className="terminal-wrapper">
        <textarea
          className="terminal-output"
          value={output || "Python 3.10 \n>>> "}
          readOnly
          rows={10}
        />
      </div>
    </div>
  );
}
