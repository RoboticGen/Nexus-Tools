/**
 * Blockly Serialization
 * Save and load workspace state
 */

import * as Blockly from "blockly/core";

export function save(workspace: Blockly.Workspace): void {
  const state = Blockly.serialization.workspaces.save(workspace);
  localStorage.setItem("blockly-workspace", JSON.stringify(state));
}

export function load(workspace: Blockly.Workspace): void {
  const saved = localStorage.getItem("blockly-workspace");
  if (saved) {
    try {
      const state = JSON.parse(saved);
      Blockly.serialization.workspaces.load(state, workspace);
    } catch (error) {
      console.error("Error loading workspace:", error);
    }
  }
}

export function exportJson(workspace: Blockly.Workspace): any {
  return Blockly.serialization.workspaces.save(workspace);
}

export function importJson(workspace: Blockly.Workspace, json: any): boolean {
  try {
    Blockly.serialization.workspaces.load(json, workspace);
    return true;
  } catch (error) {
    console.error("Error importing JSON:", error);
    return false;
  }
}
