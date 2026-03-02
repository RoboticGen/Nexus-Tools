"use client";

import { useState, useRef, useCallback, useEffect } from "react";

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
}

export function ChatPanel({ onImportJson, onConvertPython }: ChatPanelProps) {
  const [isConverting, setIsConverting] = useState(false);
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
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: -1, y: -1 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

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

  const handleConvertPython = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) {
      const botMsg: ChatMessage = {
        id: Date.now(),
        text: "Paste Python code into the input box first, then click Convert.",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
      return;
    }

    const userMsg: ChatMessage = {
      id: Date.now(),
      text: trimmed,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    const loadingMsg: ChatMessage = {
      id: Date.now() + 1,
      text: "Converting Python to blocks... (loading Pyodide)",
      sender: "bot",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, loadingMsg]);
    setIsConverting(true);

    try {
      if (onConvertPython) {
        const jsonResult = await onConvertPython(trimmed);
        // Remove load message
        setMessages((prev) => prev.filter((m) => m.id !== loadingMsg.id));
        if (jsonResult) {
          // Check for parse error
          try {
            const parsed = JSON.parse(jsonResult);
            if (parsed.error) {
              setMessages((prev) => [
                ...prev,
                { id: Date.now() + 2, text: `Conversion error: ${parsed.error}`, sender: "bot", timestamp: new Date() },
              ]);
              return;
            }
          } catch { /* not an error */ }
          // Import the resulting JSON
          if (onImportJson) {
            const success = onImportJson(jsonResult);
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now() + 3,
                text: success
                  ? "Python code converted and imported as blocks!"
                  : "Conversion succeeded but import failed. Here is the JSON:",
                sender: "bot",
                timestamp: new Date(),
                isJson: !success,
              },
            ]);
            if (!success) {
              setMessages((prev) => [
                ...prev,
                { id: Date.now() + 4, text: jsonResult, sender: "bot", timestamp: new Date(), isJson: true },
              ]);
            }
          }
        } else {
          setMessages((prev) => [
            ...prev,
            { id: Date.now() + 2, text: "Conversion returned no result.", sender: "bot", timestamp: new Date() },
          ]);
        }
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== loadingMsg.id));
        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 2, text: "Python converter is not available yet.", sender: "bot", timestamp: new Date() },
        ]);
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== loadingMsg.id));
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 2, text: `Conversion failed: ${err instanceof Error ? err.message : String(err)}`, sender: "bot", timestamp: new Date() },
      ]);
    } finally {
      setIsConverting(false);
    }
  }, [input, onConvertPython, onImportJson]);

  const handleSend = useCallback(() => {
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

    // Simulated bot reply for non-JSON messages
    setTimeout(() => {
      const botMessage: ChatMessage = {
        id: Date.now() + 1,
        text: "Thanks for your message! This is a placeholder response.",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 600);
  }, [input]);

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
              <p>{msg.text}</p>
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
        <button
          className="chat-import-btn"
          onClick={() => {
            const trimmed = input.trim();
            if (!trimmed) {
              const botMsg: ChatMessage = {
                id: Date.now(),
                text: "Paste a JSON string into the input box first, then click Import.",
                sender: "bot",
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, botMsg]);
              return;
            }
            const userMsg: ChatMessage = {
              id: Date.now(),
              text: trimmed,
              sender: "user",
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, userMsg]);
            setInput("");
            if (onImportJson) {
              const success = onImportJson(trimmed);
              setTimeout(() => {
                const botMsg: ChatMessage = {
                  id: Date.now() + 1,
                  text: success
                    ? "JSON imported to workspace successfully!"
                    : "Invalid workspace JSON. Please check the format.",
                  sender: "bot",
                  timestamp: new Date(),
                };
                setMessages((prev) => [...prev, botMsg]);
              }, 400);
            } else {
              setTimeout(() => {
                const botMsg: ChatMessage = {
                  id: Date.now() + 1,
                  text: "Import is not available yet. Workspace is still loading.",
                  sender: "bot",
                  timestamp: new Date(),
                };
                setMessages((prev) => [...prev, botMsg]);
              }, 400);
            }
          }}
          title="Import JSON to workspace"
        >
          <i className="fa fa-file-import" />
        </button>
        <button
          className="chat-convert-btn"
          onClick={handleConvertPython}
          disabled={isConverting}
          title="Convert Python code to blocks"
        >
          {isConverting ? (
            <i className="fa fa-spinner fa-spin" />
          ) : (
            <i className="fa fa-code" />
          )}
        </button>
        <textarea
          className="chat-input"
          placeholder="Type a message, paste JSON, or Python code... (Shift+Enter for new line)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={!input.trim()}
          title="Send"
        >
          <i className="fa fa-paper-plane" />
        </button>
      </div>
    </div>
  );
}
