"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import type { ConversationMessage } from "@/agent/types";

interface ChatMessage {
  id: number;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
  isJson?: boolean;
}

interface ChatPanelProps {
  onImportJson?: (jsonString: string) => boolean;
  onConvertPython?: (pythonCode: string) => Promise<string | null>;
  currentCode?: string;
}

export function ChatPanel({ onImportJson, onConvertPython, currentCode }: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 0,
      text: "Hi! How can I help you with your blocks?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: -1, y: -1 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 350, height: 460 });
  const [isResizing, setIsResizing] = useState(false);
  const [selectedMode, setSelectedMode] = useState<"agent" | "ask">("agent");
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const chatRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Set default position on mount (bottom-right corner)
  useEffect(() => {
    if (position.x === -1 && position.y === -1) {
      setPosition({
        x: window.innerWidth - 380,
        y: window.innerHeight - 520,
      });
    }
  }, [position]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Drag handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!chatRef.current) return;
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
      e.preventDefault();
    },
    [position]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - 360));
      const newY = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - 100));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // ── Resize handlers ────────────────────────────────────────────────────────
  const MIN_W = 280;
  const MIN_H = 300;
  const MAX_W = 700;
  const MAX_H = 800;

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      resizeStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        width: size.width,
        height: size.height,
      };
    },
    [size]
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { x, y, width, height } = resizeStartRef.current;
      const newW = Math.max(MIN_W, Math.min(MAX_W, width + (e.clientX - x)));
      const newH = Math.max(MIN_H, Math.min(MAX_H, height + (e.clientY - y)));
      setSize({ width: newW, height: newH });
    };

    const handleMouseUp = () => setIsResizing(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Touch drag handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!chatRef.current) return;
      const touch = e.touches[0];
      setIsDragging(true);
      setDragOffset({
        x: touch.clientX - position.x,
        y: touch.clientY - position.y,
      });
    },
    [position]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const newX = Math.max(0, Math.min(touch.clientX - dragOffset.x, window.innerWidth - 360));
      const newY = Math.max(0, Math.min(touch.clientY - dragOffset.y, window.innerHeight - 100));
      setPosition({ x: newX, y: newY });
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, dragOffset]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      text: trimmed,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Check if the message looks like JSON and auto-import
    const looksLikeJson = trimmed.startsWith("{") && trimmed.endsWith("}");
    if (looksLikeJson && onImportJson) {
      const success = onImportJson(trimmed);
      setTimeout(() => {
        const botMessage: ChatMessage = {
          id: Date.now() + 1,
          text: success
            ? "JSON detected and imported to workspace successfully!"
            : "That didn't look like a valid Blockly workspace JSON. Please check the format and try again.",
          sender: "bot",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMessage]);
      }, 400);
      return;
    }

    // ── Send through the agent graph ─────────────────────────────────────────
    setIsLoading(true);
    const thinkingId = Date.now() + 1;
    setMessages((prev) => [
      ...prev,
      { id: thinkingId, text: "Thinking...", sender: "bot", timestamp: new Date() },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history: conversationHistory.slice(-10), currentCode, mode: selectedMode }),
      });
      const data = await res.json();

      // Remove thinking bubble
      setMessages((prev) => prev.filter((m) => m.id !== thinkingId));

      if (data.error && !data.reply) {
        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 2, text: `Error: ${data.error}`, sender: "bot", timestamp: new Date() },
        ]);
        return;
      }

      const reply: string = data.reply || "No response generated.";
      const agentKind: string | undefined = data.agent; // "question" | "code_generation"

      // Show the text reply with a subtle agent label
      const agentLabel =
        agentKind === "code_generation"
          ? "🛠️ Code Generation Agent"
          : agentKind === "code_completion"
          ? "🔧 Code Completion Agent"
          : agentKind === "question"
          ? "💡 Question Agent"
          : undefined;

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          text: agentLabel ? `[${agentLabel}]\n\n${reply}` : reply,
          sender: "bot",
          timestamp: new Date(),
        },
      ]);

      // Update multi-turn conversation history
      setConversationHistory((prev) => [
        ...prev,
        { role: "user", parts: [{ text: trimmed }] },
        { role: "model", parts: [{ text: reply }] },
      ]);

      // ── Code generation: auto-convert Python → blocks ──────
      if ((agentKind === "code_generation" || agentKind === "code_completion") && data.pythonCode && onConvertPython) {
        const convertingId = Date.now() + 3;
        setMessages((prev) => [
          ...prev,
          {
            id: convertingId,
            text: "Converting generated code to blocks...",
            sender: "bot",
            timestamp: new Date(),
          },
        ]);

        try {
          const jsonResult = await onConvertPython(data.pythonCode);

          setMessages((prev) => prev.filter((m) => m.id !== convertingId));

          if (jsonResult) {
            // Check for converter-level error
            try {
              const parsed = JSON.parse(jsonResult);
              if (parsed.error) {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: Date.now() + 4,
                    text: `Block conversion error: ${parsed.error}`,
                    sender: "bot",
                    timestamp: new Date(),
                  },
                ]);
              } else if (onImportJson) {
                const success = onImportJson(jsonResult);
                setMessages((prev) => [
                  ...prev,
                  {
                    id: Date.now() + 4,
                    text: success
                      ? "✅ Code imported as blocks in your workspace!"
                      : "Code was generated but the workspace could not be updated. Please try again.",
                    sender: "bot",
                    timestamp: new Date(),
                  },
                ]);
              }
            } catch { /* not an error object */ }
          } else {
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now() + 4,
                text: "Code was generated but block conversion returned no result.",
                sender: "bot",
                timestamp: new Date(),
              },
            ]);
          }
        } catch (convErr) {
          setMessages((prev) => prev.filter((m) => m.id !== convertingId));
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + 4,
              text: `Block conversion failed: ${convErr instanceof Error ? convErr.message : String(convErr)}`,
              sender: "bot",
              timestamp: new Date(),
            },
          ]);
        }
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== thinkingId));
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          text: `Failed to reach assistant: ${err instanceof Error ? err.message : String(err)}`,
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, conversationHistory, currentCode, onImportJson, onConvertPython]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Floating toggle button when chat is closed
  if (!isOpen) {
    return (
      <button
        className="chat-toggle-btn"
        onClick={() => setIsOpen(true)}
        title="Open Chat"
        style={{
          position: "fixed",
          bottom: "1.5rem",
          right: "1.5rem",
        }}
      >
        <i className="fa fa-comment" />
      </button>
    );
  }

  return (
    <div
      className="chat-panel"
      ref={chatRef}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        cursor: isDragging ? "grabbing" : "default",
      }}
    >
      {/* Draggable header */}
      <div
        className="chat-header"
        ref={headerRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
      >
        <div className="chat-header-left">
          <i className="fa fa-comment" style={{ marginRight: "0.5rem" }} />
          <span>Chat</span>
        </div>
        <button
          className="chat-close-btn"
          onClick={() => setIsOpen(false)}
          title="Close Chat"
        >
          <i className="fa fa-xmark" />
        </button>
      </div>

      {/* Messages area */}
      <div className="chat-messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-message ${msg.sender === "user" ? "chat-message-user" : "chat-message-bot"}`}
          >
            <div className="chat-bubble">
              {msg.sender === "bot" ? (
                <div className="chat-markdown">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              ) : (
                <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
              )}
              <span className="chat-time">
                {msg.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="chat-input-area">
        <select
          className="chat-mode-dropdown"
          value={selectedMode}
          onChange={(e) => setSelectedMode(e.target.value as "agent" | "ask")}
          title="Select mode"
        >
          <option value="agent">🪄 Agent</option>
          <option value="ask">❓ Ask</option>
        </select>
        <textarea
          className="chat-input"
          placeholder="Type a message... (Shift+Enter for new line)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          title="Send"
        >
          {isLoading ? (
            <i className="fa fa-spinner fa-spin" />
          ) : (
            <>📤 <i className="fa fa-paper-plane" /></>
          )}
        </button>
      </div>

      {/* Resize handle (bottom-right corner) */}
      <div
        className="chat-resize-handle"
        onMouseDown={handleResizeMouseDown}
      />
    </div>
  );
}
