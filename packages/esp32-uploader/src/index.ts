/**
 * ESP32 Uploader Package
 * Shared package for ESP32 code uploading functionality
 */

// Components
export { ESP32Uploader, ESP32UploaderSidebar, ESP32REPL, ESP32FileManager, DeviceFileManagerSidebar } from "./components";
export type { ESP32UploaderProps } from "./components";

// Hooks
export { useESP32Uploader } from "./hooks/use-esp32-uploader";
export { useESP32Serial } from "./hooks/use-esp32-serial";
export { useESP32REPL } from "./hooks/use-esp32-repl";

// Types
export type { 
  ESP32Device, 
  ESP32UploaderState, 
  SerialPortOptions, 
  USBFilter 
} from "./types/esp32";

// Constants
export { ESP32_DEVICES, ESP32_USB_FILTERS, DEFAULT_SERIAL_OPTIONS } from "./constants/esp32";

// Utilities
export { convertToMicroPython, createMainPyFile } from "./utils/micropython-converter";
export { WebSerialPortAdapter } from "./utils/web-serial-adapter";