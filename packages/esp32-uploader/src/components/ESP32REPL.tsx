/**
 * ESP32 REPL Component
 * Interactive MicroPython REPL interface
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button, Space } from "antd";
import { LinkOutlined, DeleteOutlined, StopOutlined, ReloadOutlined } from "@ant-design/icons";
import { useESP32REPL } from "../hooks/use-esp32-repl";
import { translateErrorMessage } from "../utils/error-messages";

interface ESP32REPLProps {
  serialPort: any;
  isConnected?: boolean;
  onError?: (error: string) => void;
}

interface REPLLine {
  type: "input" | "output" | "error";
  content: string;
  timestamp: Date;
}

export function ESP32REPL({ serialPort, isConnected: parentIsConnected = true, onError }: ESP32REPLProps) {
  const [lines, setLines] = useState<REPLLine[]>([
    { type: "output", content: "ESP32 REPL", timestamp: new Date() }
  ]);
  const [currentInput, setCurrentInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
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

  // Reset REPL state when parent disconnects
  useEffect(() => {
    if (!parentIsConnected && isConnected) {
      setIsConnected(false);
      setLines([{ type: "output", content: "ESP32 REPL", timestamp: new Date() }]);
      setCurrentInput("");
      disconnect();
    }
  }, [parentIsConnected, isConnected, disconnect]);

  // Cleanup: disconnect REPL when component unmounts or serialPort changes
  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnect().catch(err => console.warn("Cleanup disconnect error:", err));
      }
    };
  }, [isConnected, disconnect]);

  const addLine = useCallback((type: REPLLine["type"], content: string) => {
    setLines(prev => {
      const newLines = [...prev, { type, content, timestamp: new Date() }];
      // Keep only last 100 lines to prevent memory issues and performance degradation
      if (newLines.length > 100) {
        return newLines.slice(-100);
      }
      return newLines;
    });
  }, []);

  const handleConnect = useCallback(async () => {
    try {
      setIsConnecting(true);
      addLine("output", "Connecting to REPL...");
      
      if (!serialPort) {
        throw new Error("Serial port not available - make sure device is connected");
      }
      
      await connectToREPL();
      setIsConnected(true);
      addLine("output", "=== REPL Connected ===");
      addLine("output", "Type commands below. Use Ctrl+C to interrupt, Ctrl+D to soft reset.");
      addLine("output", ">>> ");
    } catch (error) {
      const userFriendlyMsg = translateErrorMessage(error);
      console.error("REPL Connection error:", error);
      // Only call onError on first connection attempt, not on retries
      // addLine will show the error in the terminal
      addLine("output", ">>> ");
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [connectToREPL, serialPort, addLine]);

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

  // Auto-connect when serialPort and parentIsConnected are available
  useEffect(() => {
    if (serialPort && parentIsConnected && !isConnected && !isConnecting) {
      handleConnect();
    }
  }, [serialPort, parentIsConnected, isConnected, isConnecting, handleConnect]);

  // Retry connection after failure
  useEffect(() => {
    if (serialPort && parentIsConnected && !isConnected && !isConnecting) {
      const retryTimer = setTimeout(() => {
        handleConnect();
      }, 3000); // Retry every 3 seconds

      return () => clearTimeout(retryTimer);
    }
  }, [serialPort, parentIsConnected, isConnected, isConnecting, handleConnect]);

  return (
    <div className="esp32-repl">
      <div className="esp32-repl-header">
        <div className="esp32-repl-status">
          <span className={`status-indicator ${isConnected ? "connected" : "disconnected"}`}>
            {isConnected ? "● REPL Connected" : "● REPL Disconnected"}
          </span>
        </div>
        
        <div className="esp32-repl-controls">
          {isConnected && (
            <Space wrap style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button
                icon={<DeleteOutlined />}
                onClick={handleClearOutput}
                title="Clear output"
                style={{ backgroundColor: "var(--btn-clear)", color: "#fff", border: "none" }}
              >
                Clear
              </Button>
              <Button
                icon={<StopOutlined />}
                onClick={() => sendCtrlC()}
                title="Send Ctrl+C (KeyboardInterrupt)"
                style={{ backgroundColor: "#d97706", color: "#fff", border: "none" }}
              >
                Ctrl+C
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => sendCtrlD()}
                title="Send Ctrl+D (Soft Reset)"
                style={{ backgroundColor: "var(--btn-run)", color: "#fff", border: "none" }}
              >
                Reset
              </Button>
            </Space>
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
          {isConnecting && (
            <div className="esp32-repl-notice">
              <i className="fas fa-spinner fa-spin"></i>
              <span>Connecting to REPL...</span>
            </div>
          )}
          
          {!isConnected && !isConnecting && (
            <div className="esp32-repl-notice">
              <i className="fas fa-exclamation-triangle"></i>
              <span>Connection failed. Trying to reconnect...</span>
            </div>
          )}

          <div className="esp32-repl-output" ref={outputRef}>
            {lines.map((line, index) => (
              <div key={index} className={`repl-line repl-line-${line.type}`}>
                <span className="repl-content">{line.content}</span>
                <span className="repl-timestamp">
                  {line.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ))}
            
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
                placeholder={!isConnected ? "Waiting for connection..." : isExecuting ? "Executing..." : "Enter MicroPython command..."}
              />
              {isExecuting && <div className="repl-spinner"></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}