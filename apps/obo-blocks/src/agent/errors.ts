/**
 * Agent error classification.
 *
 * Nodes keep recording detailed failures in `state.error` for the server log,
 * but that text names internals ("Router error: fetch failed") and must never
 * reach the chat panel. `errorKind` is the sanitised channel: nodes tag what
 * went wrong, and the API turns that tag into something worth reading.
 */

export type AgentErrorKind =
  /** Provider throttled us, or the graph ran out of steps. */
  | "rate_limit"
  /** The model could not be reached at all. */
  | "unavailable"
  /** Anything else — a bug, a bad response shape, a missing key. */
  | "internal";

const USER_MESSAGE: Record<AgentErrorKind, string> = {
  rate_limit:
    "I'm getting more requests than I can keep up with right now. Give it a few seconds and try again.",
  unavailable:
    "I couldn't reach the assistant just now. Check your connection and try again.",
  internal: "Something went wrong while I was working on that. Please try again.",
};

const RATE_LIMIT_HINTS = [
  "rate limit",
  "ratelimit",
  "quota",
  "429",
  "resource_exhausted",
  "resource exhausted",
  "too many requests",
  "overloaded",
];

const UNAVAILABLE_HINTS = [
  "fetch failed",
  "network",
  "enotfound",
  "econnrefused",
  "econnreset",
  "etimedout",
  "timeout",
  "timed out",
  "socket hang up",
  "getaddrinfo",
  "503",
  "502",
];

/**
 * Map a thrown value onto the kind of thing the user can act on.
 * Falls back to "internal", which is the safe answer when unsure.
 */
export function classifyError(err: unknown): AgentErrorKind {
  const text = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();

  if (RATE_LIMIT_HINTS.some((hint) => text.includes(hint))) return "rate_limit";
  if (UNAVAILABLE_HINTS.some((hint) => text.includes(hint))) return "unavailable";
  return "internal";
}

/** The sentence to show a user for a given failure. */
export function userMessageFor(kind: AgentErrorKind = "internal"): string {
  return USER_MESSAGE[kind] ?? USER_MESSAGE.internal;
}
