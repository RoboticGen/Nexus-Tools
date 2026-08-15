"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";

import { useChatAnchor, AVATAR_SIZE } from "@/hooks/use-chat-anchor";
import { useVersionHistory } from "@/hooks/use-version-history";

import { ChatAvatar, type AvatarMood } from "./chat-avatar";

import type { ConversationMessage } from "@/agent/types";

import "./chat-panel.css";

interface ChatMessage {
  id: number;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
  isJson?: boolean;
  /** Set on the bot message that owns a generated code version. */
  versionId?: number;
  /** True once the owned version has been undone. */
  discarded?: boolean;
  /** True when the message sits after the active version, so it is out of the agent's context. */
  orphaned?: boolean;
  /** Locally generated note (restore/undo); never counted as conversation. */
  isSystemNote?: boolean;
  userMessageId?: number; // Link to the user message that prompted this response
}

/*
 * User-facing failure text. Anything technical — node names, exception
 * messages, converter output — goes to console.error instead, so the panel
 * never reads like a stack trace.
 */
const FALLBACK_ERROR = "Something went wrong while I was working on that. Please try again.";
const BLOCKS_ERROR =
  "I wrote the code, but couldn't turn it into blocks. Try rephrasing what you'd like to build.";
const OFFLINE_ERROR = "I couldn't reach the assistant. Check your connection and try again.";

interface ChatPanelProps {
  onImportJson?: (jsonString: string) => boolean;
  /** Applies a previously generated workspace JSON (same effect as import, different notification). */
  onRestoreJson?: (jsonString: string) => boolean;
  /** Reads the workspace as it stands right now, used as a version's parent snapshot. */
  onGetWorkspaceJson?: () => string | null;
  onConvertPython?: (pythonCode: string) => Promise<string | null>;
  currentCode?: string;
}

export function ChatPanel({
  onImportJson,
  onRestoreJson,
  onGetWorkspaceJson,
  onConvertPython,
  currentCode,
}: ChatPanelProps) {
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
  const [isClosing, setIsClosing] = useState(false);
  const [size, setSize] = useState({ width: 350, height: 460 });
  const [isResizing, setIsResizing] = useState(false);
  const [selectedMode, setSelectedMode] = useState<"agent" | "ask">("agent");
  const [reaction, setReaction] = useState<AvatarMood | null>(null);
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const reactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { activeVersionId, pushVersion, getVersion, restoreVersion, discardVersion } =
    useVersionHistory();

  // The avatar is the anchor; the panel's position is derived from it.
  const { avatarPos, isDragging, startDrag, placement, ready } = useChatAnchor(
    size.width,
    size.height
  );

  const chatRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(
    () => () => {
      if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    },
    []
  );

  /** Play a one-off reaction pose, then settle back to the live state. */
  const react = useCallback((mood: AvatarMood, holdMs = 2200) => {
    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    setReaction(mood);
    reactionTimerRef.current = setTimeout(() => setReaction(null), holdMs);
  }, []);

  // A momentary reaction wins; otherwise the pose tracks what is happening now.
  const mood: AvatarMood =
    reaction ?? (isLoading ? "thinking" : input.trim() ? "typing" : "idle");

  /** Unfold and fold the panel, letting the closing animation finish first. */
  const togglePanel = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    if (isOpen) {
      setIsClosing(true);
      closeTimerRef.current = setTimeout(() => {
        setIsOpen(false);
        setIsClosing(false);
      }, 190);
    } else {
      setIsClosing(false);
      setIsOpen(true);
    }
  }, [isOpen]);

  const handleAvatarPointerDown = useCallback(
    (e: React.PointerEvent) => startDrag(e, togglePanel),
    [startDrag, togglePanel]
  );

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

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    // Snapshot the state this turn branches off from. Whatever the agent
    // produces stays applied unless the user undoes it, so these are only
    // needed to make the new version undoable later.
    const parentJson = onGetWorkspaceJson?.() ?? null;
    const parentHistory = conversationHistory;

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
            : "That doesn't look like a workspace I can open. Please check the file and try again.",
          sender: "bot",
          timestamp: new Date(),
          isSystemNote: !success,
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
        // The server already sanitised this; show it as the assistant speaking,
        // with no agent label attached — a failure is not an agent's output.
        console.error("[chat] /api/chat returned an error:", data);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 2,
            text: data.error || FALLBACK_ERROR,
            sender: "bot",
            timestamp: new Date(),
            isSystemNote: true,
          },
        ]);
        react("reject", 1600);
        return;
      }

      const reply: string = data.reply || "No response generated.";
      const agentKind: string | undefined = data.agent; // "question" | "code_generation"

      // Show the text reply with a subtle agent label
      // const agentLabel =
      //   agentKind === "code_generation"
      //     ? "🛠️ Code Generation Agent"
      //     : agentKind === "code_completion"
      //     ? "🔧 Code Completion Agent"
      //     : agentKind === "question"
      //     ? "💡 Question Agent"
      //     : undefined;

      const isCodeGeneration = agentKind === "code_generation" || agentKind === "code_completion";

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          text: reply,
          sender: "bot",
          timestamp: new Date(),
          userMessageId: userMessage.id,
        },
      ]);

      // This exchange joins the context immediately, for questions and code
      // generation alike. A code version snapshots it so restoring that version
      // later can rewind the context to exactly this point.
      const historyAfter: ConversationMessage[] = [
        ...parentHistory,
        { role: "user", parts: [{ text: trimmed }] },
        { role: "model", parts: [{ text: reply }] },
      ];
      setConversationHistory(historyAfter);

      // ── Code generation: auto-convert Python → blocks ──────
      if (isCodeGeneration && data.pythonCode && onConvertPython) {
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
                console.error("[chat] Python → blocks conversion error:", parsed.error);
                setMessages((prev) => [
                  ...prev,
                  {
                    id: Date.now() + 4,
                    text: BLOCKS_ERROR,
                    sender: "bot",
                    timestamp: new Date(),
                    isSystemNote: true,
                  },
                ]);
                react("reject", 1600);
              } else if (onImportJson) {
                const success = onImportJson(jsonResult);
                const versionId = success
                  ? pushVersion({
                      id: Date.now() + 5,
                      label: trimmed,
                      json: jsonResult,
                      parentJson,
                      history: historyAfter,
                      parentHistory,
                    }).id
                  : undefined;

                setMessages((prev) => [
                  ...prev,
                  {
                    id: Date.now() + 4,
                    text: success
                      ? "✅ Code imported as blocks in your workspace!"
                      : BLOCKS_ERROR,
                    sender: "bot",
                    timestamp: new Date(),
                    versionId,
                    isSystemNote: !success,
                  },
                ]);
                react(success ? "result" : "reject", success ? 2200 : 1600);
              }
            } catch { /* not an error object */ }
          } else {
            console.error("[chat] Python → blocks conversion returned no result");
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now() + 4,
                text: BLOCKS_ERROR,
                sender: "bot",
                timestamp: new Date(),
                isSystemNote: true,
              },
            ]);
            react("reject", 1600);
          }
        } catch (convErr) {
          console.error("[chat] Python → blocks conversion failed:", convErr);
          setMessages((prev) => prev.filter((m) => m.id !== convertingId));
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + 4,
              text: BLOCKS_ERROR,
              sender: "bot",
              timestamp: new Date(),
              isSystemNote: true,
            },
          ]);
          react("reject", 1600);
        }
      }
    } catch (err) {
      console.error("[chat] Request to /api/chat failed:", err);
      setMessages((prev) => prev.filter((m) => m.id !== thinkingId));
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          text: OFFLINE_ERROR,
          sender: "bot",
          timestamp: new Date(),
          isSystemNote: true,
        },
      ]);
      react("reject", 1600);
    } finally {
      setIsLoading(false);
    }
  }, [
    input,
    conversationHistory,
    currentCode,
    selectedMode,
    onImportJson,
    onConvertPython,
    onGetWorkspaceJson,
    pushVersion,
    react,
  ]);

  /** Appends a locally generated note that never enters the agent's context. */
  const appendNote = useCallback((text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), text, sender: "bot", timestamp: new Date(), isSystemNote: true },
    ]);
  }, []);

  /**
   * Flags every real message after `versionId`'s message as out of context.
   * Messages added afterwards start fresh, so jumping forward to a newer
   * version simply re-runs this and clears the flags it no longer needs.
   */
  const markContextUpTo = useCallback((versionId: number, includeOwner = false) => {
    setMessages((prev) => {
      const targetIndex = prev.findIndex((m) => m.versionId === versionId);
      if (targetIndex < 0) return prev;
      return prev.map((m, i) => {
        if (m.isSystemNote) return m;
        const orphaned = includeOwner ? i >= targetIndex : i > targetIndex;
        return m.orphaned === orphaned ? m : { ...m, orphaned };
      });
    });
  }, []);

  /** Make an earlier generation current again: workspace, context and all. */
  const handleRestoreVersion = useCallback(
    (versionId: number) => {
      const version = getVersion(versionId);
      if (!version) return;

      // Only move the pointer once the blocks are actually back, so a failed
      // load can't leave the panel claiming a version it never applied.
      const applied = (onRestoreJson ?? onImportJson)?.(version.json) ?? false;
      if (!applied) {
        appendNote("⚠️ Could not restore that version — the workspace was left unchanged.");
        return;
      }

      restoreVersion(versionId);
      setConversationHistory(version.history);
      markContextUpTo(versionId);
      react("accept");
      appendNote(
        `↺ Restored the blocks from **${version.timestamp.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}** ("${version.label}"). Anything after it is out of context — we'll continue from here.`
      );
    },
    [getVersion, restoreVersion, onRestoreJson, onImportJson, markContextUpTo, appendNote, react]
  );

  /** Throw the current generation away and fall back to what preceded it. */
  const handleDiscardVersion = useCallback(
    (versionId: number) => {
      const version = getVersion(versionId);
      if (!version) return;

      // An empty parent means the workspace had no blocks before this version;
      // loading "{}" is what clears it back to that state.
      const applied = (onRestoreJson ?? onImportJson)?.(version.parentJson ?? "{}") ?? false;
      if (!applied) {
        appendNote("⚠️ Could not revert those blocks — the workspace was left unchanged.");
        return;
      }

      setConversationHistory(version.parentHistory);
      markContextUpTo(versionId, true);
      discardVersion(versionId);
      react("reject");
      setMessages((prev) =>
        prev.map((m) => (m.versionId === versionId ? { ...m, discarded: true } : m))
      );
      appendNote("↶ Reverted to the blocks from before that request.");
    },
    [getVersion, discardVersion, onRestoreJson, onImportJson, markContextUpTo, appendNote, react]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Nothing is placeable until the viewport has been measured on the client.
  if (!ready) return null;

  return (
    <>
      <ChatAvatar
        mood={mood}
        isOpen={isOpen}
        isDragging={isDragging}
        size={AVATAR_SIZE}
        x={avatarPos.x}
        y={avatarPos.y}
        onPointerDown={handleAvatarPointerDown}
      />

      {(isOpen || isClosing) && (
    <div
      className={`chat-panel ${isClosing ? "is-folding" : "is-unfolding"} open-${placement.side} open-${placement.vertical}`}
      ref={chatRef}
      style={{
        left: `${placement.x}px`,
        top: `${placement.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        // Aimed at the avatar, so the panel appears to unfold out of it.
        transformOrigin: `${placement.originX}px ${placement.originY}px`,
        cursor: isDragging ? "grabbing" : "default",
      }}
    >
      {/* Dragging the header moves the avatar, so the pair travels together */}
      <div
        className="chat-header"
        ref={headerRef}
        onPointerDown={startDrag}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
      >
        <div className="chat-header-left">
          <i className="fa fa-comment" style={{ marginRight: "0.5rem" }} />
          <span>Chat</span>
        </div>
        <button
          className="chat-close-btn"
          onClick={togglePanel}
          title="Close Chat"
        >
          <i className="fa fa-xmark" />
        </button>
      </div>

      {/* Messages area */}
      <div className="chat-messages">
        {messages.map((msg) => {
          const version = msg.versionId !== undefined ? getVersion(msg.versionId) : null;
          const isActiveVersion = version !== null && version.id === activeVersionId;

          return (
          <div key={msg.id} className={msg.orphaned ? "chat-entry-orphaned" : undefined}>
            <div
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
            {msg.discarded && !version && (
              <div className="chat-version-actions">
                <span className="version-badge version-badge-discarded">↶ Reverted</span>
              </div>
            )}
            {version && (
              <div className="chat-version-actions">
                {isActiveVersion ? (
                  <>
                    <span className="version-badge">✓ In your workspace</span>
                    <button
                      className="reject-btn"
                      onClick={() => handleDiscardVersion(version.id)}
                      title="Undo these blocks and go back to what came before"
                    >
                      ✕ Undo
                    </button>
                  </>
                ) : (
                  <button
                    className="restore-btn"
                    onClick={() => handleRestoreVersion(version.id)}
                    title="Put these blocks back in the workspace and continue from here"
                  >
                    ↺ Use this version
                  </button>
                )}
              </div>
            )}
          </div>
          );
        })}
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
      )}
    </>
  );
}
