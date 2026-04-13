/**
 * Knowledge Base Loader (server-only)
 *
 * Reads knowledge.md once at module load time and exports it as a string.
 * Both the Question Agent and the Code Gen Agent inject this into their
 * system instructions so Gemini stays within the platform's capabilities.
 */

import fs from "fs";
import path from "path";

function loadKnowledgeBase(): string {
  const candidates = [
    // When compiled: __dirname points to .next/server/...
    path.join(process.cwd(), "src", "agent", "language_constraints.md"),
    // Fallback: same directory as this file (ts-node / jest)
    path.join(__dirname, "language_constraints.md"),
  ];

  for (const candidate of candidates) {
    try {
      const content = fs.readFileSync(candidate, "utf-8");
      if (content.trim().length > 0) return content;
    } catch {
      // try next candidate
    }
  }

  console.warn(
    "[knowledge] Could not load language_constraints.md — agents will run without it."
  );
  return "";
}

/** The full contents of language_constraints.md, available to all agents */
export const KNOWLEDGE_BASE: string = loadKnowledgeBase();
