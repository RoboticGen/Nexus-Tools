import { useState, useCallback, useRef } from "react";

import type { ConversationMessage } from "@/agent/types";

/**
 * A snapshot of everything the agent produced in one code-generation turn.
 *
 * Snapshots are absolute, not deltas: every version carries the full workspace
 * JSON and the full conversation history both before and after its own
 * exchange. That is what makes jumping to an arbitrary version safe — restoring
 * never has to replay or unwind anything in between.
 */
export interface CodeVersion {
  id: number;
  /** The user prompt that produced this version, used as its label. */
  label: string;
  /** Workspace JSON produced by this generation. */
  json: string;
  /** Workspace JSON as it was before this generation ran. */
  parentJson: string | null;
  /** The version that was current when this one was generated. */
  parentVersionId: number | null;
  /** Agent history including this exchange. */
  history: ConversationMessage[];
  /** Agent history as it was before this exchange. */
  parentHistory: ConversationMessage[];
  timestamp: Date;
}

export type NewVersion = Omit<CodeVersion, "parentVersionId" | "timestamp">;

/**
 * Tracks every version the agent has generated and which one is currently
 * applied to the workspace.
 *
 * Nothing is ever auto-discarded: a generation stays applied until the user
 * either undoes it or restores a different version, so continuing the
 * conversation simply keeps the newest code.
 */
export function useVersionHistory() {
  const [versions, setVersions] = useState<CodeVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<number | null>(null);

  // Mirrors activeVersionId so pushVersion can read it after an await without
  // capturing a stale value from the render that started the request.
  const activeIdRef = useRef<number | null>(null);

  const setActive = useCallback((id: number | null) => {
    activeIdRef.current = id;
    setActiveVersionId(id);
  }, []);

  /** Record a freshly generated version and make it current. */
  const pushVersion = useCallback(
    (input: NewVersion): CodeVersion => {
      const version: CodeVersion = {
        ...input,
        parentVersionId: activeIdRef.current,
        timestamp: new Date(),
      };
      setVersions((prev) => [...prev, version]);
      setActive(version.id);
      return version;
    },
    [setActive]
  );

  const getVersion = useCallback(
    (id: number): CodeVersion | null => versions.find((v) => v.id === id) ?? null,
    [versions]
  );

  /**
   * Make an existing version current again. Returns the version so the caller
   * can apply its workspace JSON and history.
   */
  const restoreVersion = useCallback(
    (id: number): CodeVersion | null => {
      const version = versions.find((v) => v.id === id);
      if (!version) return null;
      setActive(id);
      return version;
    },
    [versions, setActive]
  );

  /**
   * Throw a version away and fall back to its parent. Returns the discarded
   * version so the caller can restore `parentJson` / `parentHistory`.
   *
   * Later versions are kept — their snapshots are absolute, so they remain
   * restorable even once an ancestor is gone.
   */
  const discardVersion = useCallback(
    (id: number): CodeVersion | null => {
      const version = versions.find((v) => v.id === id);
      if (!version) return null;
      setVersions((prev) => prev.filter((v) => v.id !== id));
      setActive(version.parentVersionId);
      return version;
    },
    [versions, setActive]
  );

  return {
    versions,
    activeVersionId,
    pushVersion,
    getVersion,
    restoreVersion,
    discardVersion,
  };
}
