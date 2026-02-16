/**
 * ESP32 REPL Component
 * Interactive MicroPython REPL interface
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useESP32REPL } from "../hooks/use-esp32-repl";

interface ESP32REPLProps {
  serialPort: any;
  onError?: (error: string) => void;
}

interface REPLLine {
  type: "input" | "output" | "error";
  content: string;
  timestamp: Date;
}

export function ESP32REPL({ serialPort, onError }: ESP32REPLProps) {
  const [lines, setLines] = useState<REPLLine[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const {
    connectToREPL,
    executeCommand,
    sendCtrlC,
    sendCtrlD,
    disconnect,
  } = useESP32REPL(serialPort);

  // Auto-scroll to bottom when new lines are added
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current && isConnected) {
      inputRef.current.focus();
    }
  }, [isConnected]);

  const addLine = useCallback((type: REPLLine["type"], content: string) => {
    setLines(prev => [...prev, { type, content, timestamp: new Date() }]);
  }, []);

  const handleConnect = useCallback(async () => {
    try {
      await connectToREPL();
      setIsConnected(true);
      addLine("output", "=== MicroPython REPL Connected ===");
      addLine("output", ">>> ");
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      onError?.(msg);
      addLine("error", `Connection error: ${msg}`);
    }
  }, [connectToREPL, onError, addLine]);

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect();
      setIsConnected(false);
      addLine("output", "=== REPL Disconnected ===");
    } catch (error) {
      console.warn("Error disconnecting REPL:", error);
    }
  }, [disconnect, addLine]);

  const handleExecuteCommand = useCallback(async (command: string) => {
    if (!isConnected || !command.trim()) return;

    setIsExecuting(true);
    addLine("input", `>>> ${command}`);

    try {
      const result = await executeCommand(command);
      if (result.output) {
        addLine("output", result.output);
      }
      if (result.error) {
        addLine("error", result.error);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      addLine("error", `Execution error: ${msg}`);
    } finally {
      setIsExecuting(false);
      setCurrentInput("");
    }
  }, [isConnected, executeCommand, addLine]);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isExecuting) {
      e.preventDefault();
      handleExecuteCommand(currentInput);
    } else if (e.key === "c" && e.ctrlKey) {
      e.preventDefault();
      sendCtrlC();
      addLine("output", "KeyboardInterrupt");
      setCurrentInput("");
    } else if (e.key === "d" && e.ctrlKey) {
      e.preventDefault();
      sendCtrlD();
      addLine("output", "Soft reset");
    }
  }, [currentInput, isExecuting, handleExecuteCommand, sendCtrlC, sendCtrlD, addLine]);

  const handleClearOutput = useCallback(() => {
    setLines([]);
    if (isConnected) {
      addLine("output", ">>> ");
    }
  }, [isConnected, addLine]);

  return (
    <div className="esp32-repl">
      <div className="esp32-repl-header">
        <div className="esp32-repl-status">
          <span className={`status-indicator ${isConnected ? "connected" : "disconnected"}`}>
            {isConnected ? "● REPL Connected" : "● REPL Disconnected"}
          </span>
        </div>
        
        <div className="esp32-repl-controls">
          {!isConnected ? (
            <button 
              className="btn btn-primary btn-sm" 
              onClick={handleConnect}
              disabled={!serialPort}
            >
              Connect REPL
            </button>
          ) : (
            <>
              <button className="btn btn-sm" onClick={handleClearOutput}>
                Clear
              </button>
              <button 
                className="btn btn-sm" 
                onClick={() => sendCtrlC()}
                title="Send Ctrl+C (KeyboardInterrupt)"
              >
                Ctrl+C
              </button>
              <button 
                className="btn btn-sm" 
                onClick={() => sendCtrlD()}
                title="Send Ctrl+D (Soft Reset)"
              >
                Reset
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleDisconnect}>
                Disconnect
              </button>
            </>
          )}
        </div>
      </div>

      {!serialPort && (
        <div className="esp32-repl-notice">
          <i className="fas fa-info-circle"></i>
          <span>Connect your ESP32 device first to access the REPL.</span>
        </div>
      )}

      {serialPort && (
        <div className="esp32-repl-container">
          <div className="esp32-repl-output" ref={outputRef}>
            {lines.map((line, index) => (
              <div key={index} className={`repl-line repl-line-${line.type}`}>
                <span className="repl-content">{line.content}</span>
                <span className="repl-timestamp">
                  {line.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ))}
            
            {isConnected && (
              <div className="repl-input-line">
                <span className="repl-prompt">{'>>> '}</span>
                <input
                  ref={inputRef}
                  type="text"
                  className="repl-input"
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  disabled={!isConnected || isExecuting}
                  placeholder={isExecuting ? "Executing..." : "Enter MicroPython command..."}
                />
                {isExecuting && <div className="repl-spinner"></div>}
              </div>
            )}
          </div>

          <div className="esp32-repl-help">
            <div className="help-section">
              <strong>Quick Commands:</strong>
              <ul>
                <li><code>help()</code> - Show help</li>
                <li><code>import os; os.listdir()</code> - List files</li>
                <li><code>machine.reset()</code> - Hard reset</li>
                <li><code>Ctrl+C</code> - KeyboardInterrupt</li>
                <li><code>Ctrl+D</code> - Soft reset</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}