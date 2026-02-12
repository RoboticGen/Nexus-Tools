/**
 * MicroPython Code Conversion Utilities
 * Returns code exactly as provided for direct upload
 */

/**
 * Convert Python code to MicroPython format for ESP32
 * Returns code exactly as provided
 */
export function convertToMicroPython(pythonCode: string): string {
  // Return code exactly as provided, no modifications
  return pythonCode.trim();
}

/**
 * Create main.py file content - raw code only
 */
export function createMainPyFile(micropythonCode: string): string {
  // Return code directly without any headers or modifications
  return micropythonCode;
}
