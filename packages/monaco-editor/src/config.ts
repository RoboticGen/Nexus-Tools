/**
 * Centralized Monaco Editor configuration presets
 * One source of truth for all editor settings across apps
 */

export interface EditorConfig {
  language: "python" | "javascript" | "typescript" | "json";
  theme: "vs-light" | "vs-dark";
  showMinimap: boolean;
}

// Configuration for obo-code (Python IDE - no minimap for more code space)
export const OBO_CODE_CONFIG: EditorConfig = {
  language: "python",
  theme: "vs-light",
  showMinimap: false,
};

// Configuration for obo-blocks (Blockly - minimap for better visual reference)
export const OBO_BLOCKS_CONFIG: EditorConfig = {
  language: "python",
  theme: "vs-light",
  showMinimap: false,
};

// Default configuration
export const DEFAULT_CONFIG: EditorConfig = {
  language: "python",
  theme: "vs-light",
  showMinimap: true,
};
