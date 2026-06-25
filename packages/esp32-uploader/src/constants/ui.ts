/**
 * UI Constants
 * Replace magic numbers with named constants for maintainability
 */

// Layout constants
export const UI_CONSTANTS = {
  /** Header height in pixels - used for calculating sidebar top position */
  HEADER_HEIGHT: 70,
  
  /** File manager sidebar widths */
  SIDEBAR_WIDTH_EXPANDED: 300,
  SIDEBAR_WIDTH_COLLAPSED: 52,
  
  /** Auto-detection and connection delays */
  AUTO_DETECTION_DELAY_MS: 500,
  REPL_CONNECT_RETRY_MS: 500,
  
  /** File operations */
  MAX_LINES_RETAINED: 100, // REPL output lines to keep in memory
  
  /** Z-index layers */
  Z_INDEX: {
    SIDEBAR: 50,
    MODAL: 999,
    UPLOAD_TRIGGER: 50,
  },
} as const;
