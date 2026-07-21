import { CAR_EVENT_SENTINEL, type CarEvent } from "@nexus-tools/obocar-wrapper";

export interface ParsedChunk {
  /** Plain text to append to the console output, or null if this chunk was purely an event. */
  text: string | null;
  /** Parsed structured event, if this chunk was a sentinel-tagged event line. */
  event: CarEvent | null;
}

/**
 * Parses a single line of worker stdout, splitting the sentinel-tagged
 * structured event protocol (`@@EVENT@@{...json...}`) from ordinary
 * human-readable print output.
 */
export function parseStdoutLine(line: string): ParsedChunk {
  if (!line.startsWith(CAR_EVENT_SENTINEL)) {
    return { text: line, event: null };
  }

  const payload = line.slice(CAR_EVENT_SENTINEL.length);
  try {
    const event = JSON.parse(payload) as CarEvent;
    return { text: null, event };
  } catch {
    // Malformed sentinel line - surface it as plain text rather than dropping it.
    return { text: line, event: null };
  }
}

/**
 * Splits a raw (possibly multi-line) stdout chunk into parsed lines,
 * preserving line boundaries.
 */
export function parseStdoutChunk(chunk: string): ParsedChunk[] {
  return chunk.split("\n").map(parseStdoutLine);
}
