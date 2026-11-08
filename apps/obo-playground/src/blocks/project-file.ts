// The file Export writes and Import reads: the blocks plus the world they were written for.
import { buildTrack, TRACK_PRESETS, trackFromPreset, type Point, type Track } from "../sim/track";

const APP = "obo-playground";

export function projectFile(blocks: unknown, worldKey: string, track: Track) {
  return {
    app: APP,
    version: 1,
    world: worldKey,
    ...(worldKey === "custom" ? { custom: { centerline: track.centerline, width: track.width } } : {}),
    blocks,
  };
}

export type ProjectData = { blocks: unknown; world?: { key: string; track: Track } };

/** Reads an exported project, or a bare Blockly workspace save. Throws a message a student can act on. */
export function readProjectFile(text: string): ProjectData {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file isn't a blocks file (it isn't valid JSON).");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("That file has no blocks in it.");
  const d = data as Record<string, unknown>;
  if (d.app !== APP) return { blocks: d };
  if (!d.blocks || typeof d.blocks !== "object") throw new Error("That file has no blocks in it.");
  return { blocks: d.blocks, world: readWorld(d.world, d.custom) };
}

// The file comes from the student's disk: only rebuild a world from values the track builder could produce.
function readWorld(key: unknown, custom: unknown): ProjectData["world"] {
  if (typeof key === "string" && Object.prototype.hasOwnProperty.call(TRACK_PRESETS, key)) return { key, track: trackFromPreset(key) };
  if (key !== "custom" || !custom || typeof custom !== "object") return undefined;
  const { centerline, width } = custom as { centerline?: unknown; width?: unknown };
  const isPoint = (p: unknown) =>
    Array.isArray(p) && p.length === 2 && p.every((v) => typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= 10);
  if (!Array.isArray(centerline) || centerline.length < 3 || centerline.length > 200 || !centerline.every(isPoint)) return undefined;
  if (typeof width !== "number" || !(width >= 0.3 && width <= 0.8)) return undefined;
  return { key: "custom", track: buildTrack(centerline as Point[], width) };
}
