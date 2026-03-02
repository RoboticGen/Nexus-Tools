/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';

const storageKey = 'blockly-workspace';

/**
 * Returns the active main workspace.
 * Uses Blockly.getMainWorkspace() to avoid stale refs from React re-renders.
 */
export function getActiveWorkspace(): Blockly.WorkspaceSvg {
  return Blockly.getMainWorkspace() as Blockly.WorkspaceSvg;
}

/**
 * Saves the state of the workspace to browser's local storage.
 * @param workspace Blockly workspace to save.
 */
export const save = function(workspace: Blockly.Workspace) {
  const data = Blockly.serialization.workspaces.save(workspace);
  window.localStorage?.setItem(storageKey, JSON.stringify(data));
};

/**
 * Loads saved state from local storage into the given workspace.
 * @param workspace Blockly workspace to load into.
 */
export const load = function(workspace: Blockly.Workspace) {
  const data = window.localStorage?.getItem(storageKey);
  if (!data) return;

  Blockly.Events.disable();
  Blockly.serialization.workspaces.load(JSON.parse(data), workspace, { recordUndo: false });
  Blockly.Events.enable();
};

/**
 * Exports the current workspace state as a JSON-serializable object.
 */
export const exportJson = function(): any {
  const workspace = getActiveWorkspace();
  return Blockly.serialization.workspaces.save(workspace);
};

/**
 * Imports a previously exported JSON state into the workspace.
 */
export const importJson = function(json: any): boolean {
  try {
    const workspace = getActiveWorkspace() as any;

    // Step 1: sync SVG element size with its CSS container.
    Blockly.svgResize(workspace);

    // Step 2: load the blocks.
    workspace.clear();
    Blockly.serialization.workspaces.load(json, workspace, { recordUndo: false });

    // Step 3: resize() recalculates toolbox width, scrollbar range, and
    //   re-applies the canvas translate — same work triggered by a window resize.
    workspace.resize();

    // Step 4: AFTER resize the SVG bounding rect is final, so NOW we can
    //   recompute the inverse screen CTM (screen ↔ workspace coordinate matrix).
    //   Blockly normally only does this on the first mouse event, which is
    //   exactly why clicking once "fixed" the import before this change.
    workspace.updateInverseScreenCTM();

    // Step 5: one rAF lets the browser commit the paint, then centre the view.
    requestAnimationFrame(() => {
      const blocks = workspace.getAllBlocks(false);
      if (blocks.length > 0) {
        workspace.centerOnBlock(blocks[0].id);
      }
    });

    return true;
  } catch (err) {
    console.error('Error importing workspace:', err);
    return false;
  }
};
