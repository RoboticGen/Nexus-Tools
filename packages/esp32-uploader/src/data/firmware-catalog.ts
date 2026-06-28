/**
 * MicroPython Firmware Catalog - ESP32 Dev Boards
 * Generic Espressif ESP32 board firmware versions
 */

export interface FirmwareBoard {
  vendor: string;
  model: string;
  family: string;
  infoUrl: string;
  downloads: Array<{
    version: string;
    url: string;
  }>;
}

export const FIRMWARE_CATALOG: FirmwareBoard[] = [
  {
    vendor: "Espressif",
    model: "ESP32 (Generic)",
    family: "esp32",
    infoUrl: "https://micropython.org/download/ESP32_GENERIC",
    downloads: [
      {
        version: "1.28.0",
        url: "https://micropython.org/resources/firmware/ESP32_GENERIC-20260406-v1.28.0.bin",
      },
      {
        version: "1.27.0",
        url: "https://micropython.org/resources/firmware/ESP32_GENERIC-20251209-v1.27.0.bin",
      },
    ],
  },
  {
    vendor: "Espressif",
    model: "ESP32-S2 (Generic)",
    family: "esp32s2",
    infoUrl: "https://micropython.org/download/ESP32_GENERIC_S2",
    downloads: [
      {
        version: "1.28.0",
        url: "https://micropython.org/resources/firmware/ESP32_GENERIC_S2-20260406-v1.28.0.bin",
      },
      {
        version: "1.27.0",
        url: "https://micropython.org/resources/firmware/ESP32_GENERIC_S2-20251209-v1.27.0.bin",
      },
    ],
  },
  {
    vendor: "Espressif",
    model: "ESP32-S3 (Generic)",
    family: "esp32s3",
    infoUrl: "https://micropython.org/download/ESP32_GENERIC_S3",
    downloads: [
      {
        version: "1.28.0",
        url: "https://micropython.org/resources/firmware/ESP32_GENERIC_S3-20260406-v1.28.0.bin",
      },
      {
        version: "1.27.0",
        url: "https://micropython.org/resources/firmware/ESP32_GENERIC_S3-20251209-v1.27.0.bin",
      },
    ],
  },
  {
    vendor: "Espressif",
    model: "ESP32-C2 (Generic)",
    family: "esp32c2",
    infoUrl: "https://micropython.org/download/ESP32_GENERIC_C2",
    downloads: [
      {
        version: "1.28.0",
        url: "https://micropython.org/resources/firmware/ESP32_GENERIC_C2-20260406-v1.28.0.bin",
      },
      {
        version: "1.27.0",
        url: "https://micropython.org/resources/firmware/ESP32_GENERIC_C2-20251209-v1.27.0.bin",
      },
    ],
  },
  {
    vendor: "Espressif",
    model: "ESP32-C3 (Generic)",
    family: "esp32c3",
    infoUrl: "https://micropython.org/download/ESP32_GENERIC_C3",
    downloads: [
      {
        version: "1.28.0",
        url: "https://micropython.org/resources/firmware/ESP32_GENERIC_C3-20260406-v1.28.0.bin",
      },
      {
        version: "1.27.0",
        url: "https://micropython.org/resources/firmware/ESP32_GENERIC_C3-20251209-v1.27.0.bin",
      },
    ],
  },
  {
    vendor: "Espressif",
    model: "ESP32-C6 (Generic)",
    family: "esp32c6",
    infoUrl: "https://micropython.org/download/ESP32_GENERIC_C6",
    downloads: [
      {
        version: "1.28.0",
        url: "https://micropython.org/resources/firmware/ESP32_GENERIC_C6-20260406-v1.28.0.bin",
      },
      {
        version: "1.27.0",
        url: "https://micropython.org/resources/firmware/ESP32_GENERIC_C6-20251209-v1.27.0.bin",
      },
    ],
  },
  {
    vendor: "Espressif",
    model: "ESP8266 (Generic)",
    family: "esp8266",
    infoUrl: "https://micropython.org/download/ESP8266_GENERIC",
    downloads: [
      {
        version: "1.28.0",
        url: "https://micropython.org/resources/firmware/ESP8266_GENERIC-20260406-v1.28.0.bin",
      },
      {
        version: "1.27.0",
        url: "https://micropython.org/resources/firmware/ESP8266_GENERIC-20251209-v1.27.0.bin",
      },
    ],
  },
];
