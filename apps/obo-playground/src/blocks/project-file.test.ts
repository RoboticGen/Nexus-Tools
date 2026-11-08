import { describe, expect, it } from "vitest";

import { buildTrack, trackFromPreset } from "../sim/track";
import { projectFile, readProjectFile } from "./project-file";

const blocks = { blocks: { languageVersion: 0, blocks: [{ type: "robot_stop", x: 0, y: 0 }] } };
const roundTrip = (file: object) => readProjectFile(JSON.stringify(file));

describe("project file", () => {
  it("brings back the blocks and a preset world", () => {
    const read = roundTrip(projectFile(blocks, "maze", trackFromPreset("maze")));
    expect(read.blocks).toEqual(blocks);
    expect(read.world?.key).toBe("maze");
    expect(read.world?.track.goal).toBeDefined();
  });

  it("rebuilds a custom track from its centreline and width", () => {
    const custom = buildTrack([[0, 0], [1, 0], [1, 1], [0, 1]], 0.4);
    const read = roundTrip(projectFile(blocks, "custom", custom));
    expect(read.world?.key).toBe("custom");
    expect(read.world?.track.centerline).toEqual(custom.centerline);
    expect(read.world?.track.width).toBe(0.4);
  });

  it("reads a bare Blockly save as blocks with no world", () => {
    expect(roundTrip(blocks)).toEqual({ blocks });
  });

  it.each([
    ["an unknown world", { world: "toString" }],
    ["a custom track with too few points", { world: "custom", custom: { centerline: [[0, 0]], width: 0.5 } }],
    ["a custom track wider than the builder allows", { world: "custom", custom: { centerline: [[0, 0], [1, 0], [1, 1]], width: 5 } }],
    ["a custom track with a non-number point", { world: "custom", custom: { centerline: [[0, 0], [1, "x"], [1, 1]], width: 0.5 } }],
  ])("keeps the blocks but ignores %s", (_, extra) => {
    const read = roundTrip({ app: "obo-playground", version: 1, blocks, ...extra });
    expect(read.blocks).toEqual(blocks);
    expect(read.world).toBeUndefined();
  });

  it.each([
    ["text that isn't JSON", "not json"],
    ["a JSON list", "[1, 2]"],
    ["a project file without blocks", JSON.stringify({ app: "obo-playground", version: 1, world: "oval" })],
  ])("rejects %s", (_, text) => {
    expect(() => readProjectFile(text)).toThrow();
  });
});
