/**
 * ESP32 REPL – flex-based layout.
 *
 * Uses flex layout so the REPL fills whatever container it's placed in.
 * The output area is flex: 1 (takes remaining space), toolbar and input
 * are flex-shrink: 0 (fixed size). No viewport calc() needed.
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "antd";
import { DeleteOutlined, StopOutlined, ReloadOutlined } from "@ant-design/icons";
import { useESP32REPL } from "../hooks/use-esp32-repl";

interface ESP32REPLProps {
  serialPort: any;
  isConnected?: boolean;
  onError?: (error: string) => void;
}

interface Line {
  type: "input" | "output" | "error";
  text: string;
}

const MAX_LINES = 200;

export function ESP32REPL({
  serialPort,
  isConnected: parentConnected = true,
}: ESP32REPLProps) {
  const [lines, setLines] = useState<Line[]>([]);
  const [cmd, setCmd] = useState("");
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const connectingRef = useRef(false);

  const { connectToREPL, executeCommand, sendCtrlC, sendCtrlD, disconnect } =
    useESP32REPL(serialPort);

  const push = useCallback((type: Line["type"], text: string) => {
    setLines((prev) => {
      const next = [...prev, { type, text }];
      return next.length > MAX_LINES ? next.slice(-MAX_LINES) : next;
    });
  }, []);

  // scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  // auto-connect
  const doConnect = useCallback(async () => {
    if (!serialPort || connectingRef.current) return;
    connectingRef.current = true;
    try {
      push("output", "Connecting to REPL…");
      await connectToREPL();
      setConnected(true);
      push("output", "=== REPL Connected ===");
      push("output", "Ready. Type Python commands below.");
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err) {
      push("error", `Connection failed: ${err instanceof Error ? err.message : String(err)}`);
      setConnected(false);
    } finally {
      connectingRef.current = false;
    }
  }, [serialPort, connectToREPL, push]);

  useEffect(() => {
    if (serialPort && parentConnected && !connected) doConnect();
  }, [serialPort, parentConnected, connected]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!parentConnected && connected) {
      setConnected(false);
      setLines([]);
      connectingRef.current = false;
      disconnect();
    }
  }, [parentConnected, connected, disconnect]);

  useEffect(() => () => { disconnect().catch(() => {}); }, [disconnect]);

  // execute command
  const run = useCallback(async () => {
    if (!connected || !cmd.trim() || busy) return;
    const c = cmd.trim();
    setCmd("");
    setBusy(true);
    push("input", `>>> ${c}`);
    try {
      const r = await executeCommand(c);
      if (r.output) push("output", r.output);
      if (r.error) push("error", r.error);
    } catch (err) {
      push("error", `${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }, [connected, cmd, busy, executeCommand, push]);

  const onKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(); }
      else if (e.ctrlKey && e.key === "c") { e.preventDefault(); sendCtrlC(); push("output", "^C"); setCmd(""); }
      else if (e.ctrlKey && e.key === "d") { e.preventDefault(); sendCtrlD(); push("output", "^D Soft reset"); }
    },
    [run, sendCtrlC, sendCtrlD, push],
  );

  return (
    <div className="repl">
      {/* toolbar */}
      <div className="repl__toolbar">
        <span className="repl__status">
          <span className={connected ? "repl__dot repl__dot--on" : "repl__dot repl__dot--off"} />
          {connected ? "Connected" : "Disconnected"}
        </span>
        {connected && (
          <span className="repl__actions">
            <Button size="small" style={{ backgroundColor: "#9d9d9d", color: "#fff", border: "none" }} icon={<DeleteOutlined />} onClick={() => setLines([])}>Clear</Button>
            <Button size="small" style={{ backgroundColor: "#9d9d9d", color: "#fff", border: "none" }} icon={<StopOutlined />} onClick={() => { sendCtrlC(); push("output", "^C"); }}>Ctrl+C</Button>
            <Button size="small" style={{ backgroundColor: "#9d9d9d", color: "#fff", border: "none" }} icon={<ReloadOutlined />} onClick={() => { sendCtrlD(); push("output", "^D"); }}>Reset</Button>
          </span>
        )}
      </div>

      {/* output (scrollable, calc-based height) */}
      <div className="repl__output">
        {!serialPort && <p className="repl__msg">Connect your ESP32 device to use REPL.</p>}
        {serialPort && !connected && <p className="repl__msg">Connecting…</p>}
        {lines.map((l, i) => (
          <div key={i} className={`repl__line repl__line--${l.type}`}>{l.text}</div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* input bar (fixed height, always at bottom) */}
      {connected && (
        <div className="repl__input">
          <span className="repl__prompt">{">>>"}</span>
          <input
            ref={inputRef}
            className="repl__field"
            value={cmd}
            onChange={(e) => setCmd(e.target.value)}
            onKeyDown={onKey}
            disabled={busy}
            placeholder={busy ? "Running…" : "Type command…"}
            autoComplete="off"
            spellCheck={false}
          />
          {busy && <span className="repl__spin" />}
        </div>
      )}
    </div>
  );
}
