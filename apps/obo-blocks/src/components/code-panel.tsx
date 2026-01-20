interface CodePanelProps {
  code: string;
  isEditing: boolean;
  onCodeChange: (code: string) => void;
  onEditToggle: (editing: boolean) => void;
  onRun: () => void;
  onCopy: () => void;
  onExport: () => void;
}

import { CodeEditor } from "./code-editor";

export function CodePanel({
  code,
  isEditing,
  onCodeChange,
  onEditToggle,
  onRun,
  onCopy,
  onExport,
}: CodePanelProps) {
  return (
    <div className="code" id="code" style={{ gridArea: "code", minHeight: "10vh" }}>
      <div className="button-row">
        <p className="code-title">Python Code</p>
        <div className="button-group">
          <button
            className="button"
            id="edit-button"
            onClick={() => onEditToggle(!isEditing)}
          >
            <i className="fa fa-pencil" style={{ paddingRight: "2px" }}></i>
            <span id="edit-text">{isEditing ? "Editing" : "Edit"}</span>
          </button>
          <button className="button" id="run-button" onClick={onRun}>
            <i id="run-icon" className="fa fa-flag"></i>
            <span id="run-text">Run</span>
          </button>
          <button className="button" id="copy-button" onClick={onCopy}>
            <i className="fa fa-copy"></i>
            <span id="copy-text">Copy</span>
          </button>
          <button className="button" id="export-button" onClick={onExport}>
            <i
              className="fa fa-file-export"
              style={{ paddingRight: "4px" }}
            ></i>
            <span id="export-text">Export</span>
          </button>
        </div>
      </div>
      <div className="code-snippet" id="code-editor">
        <CodeEditor code={code} onChange={onCodeChange} readOnly={!isEditing} />
      </div>
    </div>
  );
}
