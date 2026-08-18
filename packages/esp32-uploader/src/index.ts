/**
 * ESP32 Uploader Package
 *
 * Headless: hooks, serial transport, firmware catalog and types — no UI, no
 * styles, no design-system dependency. The antd-based components that used to
 * live here (ESP32Uploader, ESP32UploaderSidebar, ESP32REPL, ESP32Flasher,
 * ESP32FileManager, DeviceFileManagerSidebar, ESP32Provider) are gone: every
 * consuming app now renders these hooks through its own design-system
 * components, which is why nothing imported them any more.
 *
 * That also removes antd from the dependency graph of everything that touches
 * a serial port. Legacy `esp32.css` is still published under the "./styles"
 * subpath for apps not yet migrated, but is deliberately NOT imported here —
 * doing so shipped unlayered CSS into every consumer and overrode whatever
 * design system they were on.
 */

// Hooks
export { useESP32Uploader } from "./hooks/use-esp32-uploader";
export { useESP32Serial } from "./hooks/use-esp32-serial";
export { useESP32REPL } from "./hooks/use-esp32-repl";
export { useESP32FileManager } from "./hooks/use-esp32-file-manager";
export { useESP32Flasher } from "./hooks/use-esp32-flasher";

// Types
export type {
  ESP32Device,
  ESP32UploaderState,
  SerialPort,
  SerialPortOptions,
  USBFilter
} from "./types/esp32";

// Constants
export { ESP32_DEVICES, ESP32_USB_FILTERS, DEFAULT_SERIAL_OPTIONS } from "./constants/esp32";

// Utilities
export { convertToMicroPython, createMainPyFile } from "./utils/micropython-converter";
export { serialStreamManager } from "./utils/serial-stream-manager";
export {
  getAvailableFirmwares,
  filterFirmwaresByChip,
  getBoardsByChipFamily,
  getFirmwaresByBoard,
  downloadFirmware,
  verifyFirmwareChecksum,
  translateFlasherError,
  formatFileSize,
  formatDuration,
  estimateFlashTime,
} from "./utils/flasher-helper";

// Firmware Catalog
export { FIRMWARE_CATALOG, type FirmwareBoard } from "./data/firmware-catalog";