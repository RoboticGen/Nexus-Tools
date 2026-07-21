"use client";

import { DeleteOutlined, StopOutlined } from "@ant-design/icons";
import { Button } from "@nexus-tools/ui";

interface ConsolePanelProps {
  output: string;
  isRunning: boolean;
  onClear: () => void;
  onStop: () => void;
}

/**
 * Console output panel for the OBO Playground.
 * Simplified version of obo-code's output-terminal.tsx - just the
 * read-only output stream, no REPL/File Manager tabs since there's no
 * physical ESP32 device involved in this pure browser simulation.
 */
export function ConsolePanel({ output, isRunning, onClear, onStop }: ConsolePanelProps) {
  return (
    <div className="console-panel">
      <div className="console-panel-header">
        <p className="console-panel-title">Console</p>
        <div className="console-panel-actions">
          <Button
            icon={<DeleteOutlined />}
            onClick={onClear}
            disabled={isRunning}
            title={isRunning ? "Stop execution first to clear output" : "Clear Output"}
          >
            Clear
          </Button>
          <Button
            variant={isRunning ? "destructive" : "default"}
            icon={<StopOutlined />}
            onClick={onStop}
            title="Stop Execution"
          >
            Stop
          </Button>
        </div>
      </div>
      <textarea
        className="console-panel-output"
        value={output || "Python 3.10\n>>> "}
        readOnly
      />
    </div>
  );
}
