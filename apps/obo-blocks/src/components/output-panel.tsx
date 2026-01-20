interface OutputPanelProps {
  onClear: () => void;
  onStop: () => void;
}

export function OutputPanel({ onClear, onStop }: OutputPanelProps) {
  return (
    <div className="output" id="output" style={{ gridArea: "output" }}>
      <div className="button-row">
        <label htmlFor="terminal-output" className="output-title">
          Output
        </label>
        <div className="button-group">
          <button className="button" id="clear-button" onClick={onClear}>
            <i id="run-clear" className="fa fa-trash"></i>
            <span id="run-text">Clear</span>
          </button>
          <button className="button" id="stop-button" onClick={onStop}>
            <i id="run-clear" className="fa fa-trash"></i>
            <span id="stop-text">Stop</span>
          </button>
        </div>
      </div>
      <div className="terminal-output-div">
        <textarea
          id="terminal-output"
          className="terminal-output"
          rows={10}
          readOnly
          defaultValue={""}
        ></textarea>
      </div>
    </div>
  );
}
