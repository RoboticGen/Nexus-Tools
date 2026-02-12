/**
 * ESP32 Constants
 */

import type { ESP32Device, USBFilter, SerialPortOptions } from "@/types/esp32";

/** Supported ESP32 device types */
export const ESP32_DEVICES: ESP32Device[] = [
  { name: "ESP32 Dev Module", chipFamily: "ESP32", baudRate: 115200 },
  { name: "ESP32-S2", chipFamily: "ESP32-S2", baudRate: 115200 },
  { name: "ESP32-S3", chipFamily: "ESP32-S3", baudRate: 115200 },
  { name: "ESP32-C3", chipFamily: "ESP32-C3", baudRate: 115200 },
  { name: "ESP32-C6", chipFamily: "ESP32-C6", baudRate: 115200 },
];

/** USB vendor/product ID filters for common ESP32 USB-to-serial chips */
export const ESP32_USB_FILTERS: USBFilter[] = [
  { usbVendorId: 0x10c4, usbProductId: 0xea60 }, // CP2102
  { usbVendorId: 0x1a86, usbProductId: 0x7523 }, // CH340
  { usbVendorId: 0x0403, usbProductId: 0x6001 }, // FTDI
  { usbVendorId: 0x239a },                        // Adafruit
  { usbVendorId: 0x303a },                        // Espressif
];

/** Default serial port options for ESP32 communication */
export const DEFAULT_SERIAL_OPTIONS: Omit<SerialPortOptions, 'baudRate'> = {
  dataBits: 8,
  parity: "none",
  stopBits: 1,
  flowControl: "none",
};

/** Control characters for MicroPython REPL */
export const REPL_CONTROL = {
  CTRL_A: '\x01',  // Raw REPL mode
  CTRL_B: '\x02',  // Normal REPL mode
  CTRL_C: '\x03',  // Interrupt/Stop
  CTRL_D: '\x04',  // Soft reset / Execute raw REPL
} as const;

/** Delay constants for serial communication (in ms) */
export const SERIAL_DELAYS = {
  AFTER_CTRL_A: 100,
  AFTER_FILE_WRITE: 1000,
  AFTER_CTRL_C: 100,
} as const;
