/**
 * ESP32 Flasher Helper Utilities
 * Firmware management, error translation, and flasher utilities
 */

import type { FirmwareImage, ChipInfo } from "../types/esp32";

// ─── Firmware Management ────────────────────────────────────────────────────

/**
 * Get list of available MicroPython releases for ESP32.
 * Uses official GitHub releases and micropython.org downloads.
 */
export function getAvailableFirmwares(): FirmwareImage[] {
  return [
    {
      name: "MicroPython 1.24 (ESP32)",
      version: "1.24-esp32",
      url: "https://github.com/micropython/micropython/releases/download/v1.24/esp32-20240602-v1.24.bin",
      releaseDate: "2024-06-02",
      description: "Stable release for ESP32",
      chipFamily: "ESP32",
      checksumSha256: undefined,
    },
    {
      name: "MicroPython 1.23 (ESP32)",
      version: "1.23-esp32",
      url: "https://github.com/micropython/micropython/releases/download/v1.23/esp32-20240304-v1.23.bin",
      releaseDate: "2024-03-04",
      description: "Previous stable release for ESP32",
      chipFamily: "ESP32",
    },
    {
      name: "MicroPython 1.24 (ESP32-S3)",
      version: "1.24-esp32s3",
      url: "https://github.com/micropython/micropython/releases/download/v1.24/esp32s3-20240602-v1.24.bin",
      releaseDate: "2024-06-02",
      description: "Stable release for ESP32-S3",
      chipFamily: "ESP32-S3",
    },
    {
      name: "MicroPython 1.23 (ESP32-S3)",
      version: "1.23-esp32s3",
      url: "https://github.com/micropython/micropython/releases/download/v1.23/esp32s3-20240304-v1.23.bin",
      releaseDate: "2024-03-04",
      description: "Previous stable release for ESP32-S3",
      chipFamily: "ESP32-S3",
    },
    {
      name: "MicroPython 1.24 (ESP32-C3)",
      version: "1.24-esp32c3",
      url: "https://github.com/micropython/micropython/releases/download/v1.24/esp32c3-20240602-v1.24.bin",
      releaseDate: "2024-06-02",
      description: "Stable release for ESP32-C3",
      chipFamily: "ESP32-C3",
    },
  ];
}

/**
 * Filter firmwares suitable for a given chip family.
 */
export function filterFirmwaresByChip(
  firmwares: FirmwareImage[],
  chipFamily: string
): FirmwareImage[] {
  return firmwares.filter((fw) =>
    fw.chipFamily === chipFamily || fw.chipFamily === "ESP32"
  );
}

/**
 * Download firmware binary from URL.
 * Returns ArrayBuffer of the binary data.
 */
export async function downloadFirmware(
  url: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<ArrayBuffer> {
  try {
    console.log(`[Flasher] Downloading firmware from: ${url}`);
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/octet-stream",
      },
      mode: "cors",
      credentials: "omit",
    });

    if (!response.ok) {
      console.error(`[Flasher] HTTP error ${response.status}: ${response.statusText}`);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const total = parseInt(response.headers.get("content-length") || "0");
    console.log(`[Flasher] Firmware size: ${total} bytes`);
    
    const reader = response.body?.getReader();

    if (!reader) {
      throw new Error("Response body not readable");
    }

    const chunks: Uint8Array[] = [];
    let loaded = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      loaded += value.length;
      onProgress?.(loaded, total);
    }

    // Combine chunks into single ArrayBuffer
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    console.log(`[Flasher] Download complete: ${totalLength} bytes`);
    return result.buffer;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Flasher] Download failed: ${message}`);
    
    // Provide more specific error messages
    if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
      throw new Error("Network error: Check your internet connection and try again. The firmware URL may be unreachable.");
    } else if (message.includes("CORS") || message.includes("cors")) {
      throw new Error("CORS error: This URL is not allowed. Try downloading from a different source.");
    } else if (message.includes("404")) {
      throw new Error("Firmware not found: The firmware file may have been moved or removed.");
    } else if (message.includes("Connection refused")) {
      throw new Error("Connection refused: The download server is not responding.");
    }
    
    throw new Error(`Failed to download firmware: ${message}`);
  }
}

/**
 * Calculate SHA256 checksum of binary data.
 * Returns hex string.
 */
export async function calculateSHA256(
  data: ArrayBuffer
): Promise<string> {
  try {
    const buffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(buffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to calculate checksum: ${message}`);
  }
}

/**
 * Verify firmware checksum if available.
 */
export async function verifyFirmwareChecksum(
  firmware: ArrayBuffer,
  expectedChecksum?: string
): Promise<boolean> {
  if (!expectedChecksum) {
    return true; // No checksum to verify
  }

  const calculated = await calculateSHA256(firmware);
  return calculated.toLowerCase() === expectedChecksum.toLowerCase();
}

// ─── Error Translation ──────────────────────────────────────────────────────

export function translateFlasherError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Download/network errors
    if (message.includes("download")) {
      return error.message; // Use full message as it's already detailed
    }

    if (message.includes("network error")) {
      return error.message;
    }

    if (message.includes("cors")) {
      return error.message;
    }

    if (message.includes("not found")) {
      return error.message;
    }

    // Detect common error patterns
    if (message.includes("timeout")) {
      return "Device response timeout. Check USB connection and ensure ESP32 is not in use.";
    }

    if (message.includes("no port selected")) {
      return "No device selected. Please choose an ESP32 device.";
    }

    if (message.includes("disconnected")) {
      return "Device disconnected. Please reconnect and try again.";
    }

    if (message.includes("checksum")) {
      return "Firmware checksum mismatch. File may be corrupted. Try re-downloading.";
    }

    if (message.includes("verify")) {
      return "Verification failed. Device may have failed to flash properly.";
    }

    if (message.includes("erase")) {
      return "Failed to erase flash memory. Device may be protected or disconnected.";
    }

    // Return original message if no pattern matches
    return message;
  }

  return "An unknown error occurred during flashing.";
}

// ─── Backup & Restore ───────────────────────────────────────────────────────

/**
 * Create a backup of current firmware.
 * In production, would read flash memory via esptool commands.
 * For now, this is a placeholder that stores metadata.
 */
export function createBackupMetadata(chipInfo: ChipInfo, firmware: string): object {
  return {
    timestamp: Date.now(),
    date: new Date().toISOString(),
    chipId: chipInfo.chipId,
    chipFamily: chipInfo.chipFamily,
    firmwareVersion: firmware,
  };
}

/**
 * Format firmware size as human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Format time duration in seconds to human-readable format.
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Calculate estimated flash time based on binary size.
 * Rough estimate: ESP32 flashes at ~500 KB/s
 */
export function estimateFlashTime(binarySize: number): number {
  const FLASH_SPEED_KBS = 500; // KB/s
  const sizeKB = binarySize / 1024;
  const estimatedSeconds = sizeKB / FLASH_SPEED_KBS;

  // Add buffer for overhead (connection, verification)
  return estimatedSeconds + 5;
}

/**
 * Calculate flash progress based on time elapsed vs estimated time.
 * Linear progress estimate (can be improved with real progress from flasher).
 */
export function calculateProgress(
  elapsedMs: number,
  estimatedDurationMs: number
): number {
  const progress = (elapsedMs / estimatedDurationMs) * 100;
  return Math.min(Math.max(progress, 0), 100);
}
