/**
 * Python-to-Blocks Module
 *
 * Public API for converting Python source code into Blockly workspace JSON.
 *
 * Usage:
 *   import { convertPythonToBlocks } from "@/python-to-blocks";
 *   const json = await convertPythonToBlocks(pythonCode);
 *   // json is a Blockly workspace JSON string ready for importJson()
 */

export { convertPythonToBlocks } from "./converter";
