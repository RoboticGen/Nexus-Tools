/**
 * ESP32 Uploader Package
 * Shared package for ESP32 code uploading functionality
 */

// Styles
import './styles';

// Components
export { ESP32Uploader, ESP32UploaderSidebar, ESP32REPL, ESP32FileManager, DeviceFileManagerSidebar } from "./components";
export type { ESP32UploaderProps } from "./components";

// Context
export { ESP32Provider, useESP32Context } from "./contexts/ESP32Context";

// Hooks
export { useESP32Uploader } from "./hooks/use-esp32-uploader";
export { useESP32Serial } from "./hooks/use-esp32-serial";
export { useESP32REPL } from "./hooks/use-esp32-repl";
export { useESP32FileManager } from "./hooks/use-esp32-file-manager";

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
export { serialStreamManager } from "./utils/serial-stream-manager";