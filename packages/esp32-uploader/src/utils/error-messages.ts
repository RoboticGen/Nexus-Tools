/**
 * Error message translation utility
 * Converts technical errors to user-friendly messages
 */

export function translateErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  
  // WritableStream locked - REPL is using the port
  if (msg.includes("WritableStream is locked") || msg.includes("Cannot create writer")) {
    return "⚠️ Serial port is currently in use by the REPL.\n\nPlease close the REPL connection first, then try uploading again.";
  }
  
  // Serial port not available or not found
  if (
    msg.includes("Serial port not available") || 
    msg.includes("getPort") ||
    msg.includes("No port selected")
  ) {
    return "❌ ESP32 device not found or port unavailable.\n\nMake sure your device is:\n• Properly connected via USB\n• Powered on\n• Using a valid USB cable\n\nThen try again.";
  }
  
  // Connection lost during upload
  if (
    msg.includes("Connection lost") || 
    msg.includes("disconn") ||
    msg.includes("port closed") ||
    msg.includes("ERR_STREAM_DESTROYED")
  ) {
    return "❌ Connection lost during upload.\n\nYour device may have disconnected. Please:\n• Reconnect your ESP32\n• Try uploading again";
  }
  
  // Timeout errors
  if (msg.includes("timeout") || msg.includes("Timeout")) {
    return "⏱️ Upload timed out.\n\nThe device is not responding. Try:\n• Reconnecting your device\n• Restarting your ESP32\n• Checking the USB cable";
  }
  
  // Permission errors - cannot access port
  if (
    msg.includes("permission") || 
    msg.includes("Permission") ||
    msg.includes("EACCES") ||
    msg.includes("access denied")
  ) {
    return "🔒 Cannot access the serial port.\n\nThis usually means:\n• Another application is using the port\n• You need to close the REPL or other terminal\n• On Linux, you may need appropriate permissions\n\nTry unplugging and reconnecting your device.";
  }
  
  // Device disconnected
  if (msg.includes("ENODEV") || msg.includes("device not found")) {
    return "❌ Device disconnected.\n\nYour ESP32 was unplugged or turned off during the operation. Please reconnect it.";
  }
  
  // No code to upload
  if (msg.includes("No code to upload")) {
    return "📝 No code to upload.\n\nPlease write some code in the editor first.";
  }
  
  // Browser not supported
  if (msg.includes("Web Serial API not supported")) {
    return "🌐 Your browser doesn't support Web Serial API.\n\nPlease use:\n• Chrome 89+\n• Edge 89+\n• Opera 75+\n\nAnd make sure to use HTTPS or localhost.";
  }
  
  // Failed to load ESP tools
  if (msg.includes("Failed to load ESP Web Tools")) {
    return "⚙️ Failed to load ESP SDK tools.\n\nPlease refresh the page and try again.";
  }
  
  // Baud rate issues
  if (msg.includes("Unsupported baud rate") || msg.includes("baud")) {
    return "⚙️ Serial communication issue.\n\nTry:\n• Disconnecting and reconnecting your device\n• Using a different USB port\n• Restarting your computer";
  }
  
  // Connection cancelled by user
  if (msg.includes("Connection cancelled")) {
    return "Cancelled by user.";
  }
  
  // Default fallback
  return `❌ Upload failed: ${msg}\n\nTroubleshooting:\n• Reconnect your ESP32\n• Check the USB cable\n• Close any other serial applications`;
}
