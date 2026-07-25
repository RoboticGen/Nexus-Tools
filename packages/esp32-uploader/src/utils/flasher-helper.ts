/**
 * ESP32 Flasher Helper Utilities
 * Firmware management, error translation, and flasher utilities
 */

import type { FirmwareImage, ChipInfo } from "../types/esp32";
import { FIRMWARE_CATALOG } from "../data/firmware-catalog";

// ─── Firmware Management ────────────────────────────────────────────────────

/**
 * Get list of available MicroPython releases for ESP32.
 * Loads from comprehensive firmware catalog based on Thonny IDE data.
 */
export function getAvailableFirmwares(): FirmwareImage[] {
  const firmwares: FirmwareImage[] = [];
  const versionReleaseMap: Record<string, string> = {
    "1.28.0": "2026-04-06",
    "1.27.0": "2025-12-09",
    "1.26.0": "2025-09-23",
    "1.25.0": "2025-07-01",
    "1.24.0": "2025-04-14",
  };

  for (const board of FIRMWARE_CATALOG) {
    for (const download of board.downloads) {
      const releaseDate = versionReleaseMap[download.version] || "unknown";
      const familyNormalized = board.family.toUpperCase().replace(/^ESP/, "ESP");
      // Create unique key by including vendor to avoid duplicates across board models
      const vendorKey = board.vendor.toLowerCase().replace(/\s+/g, "-");
      const modelKey = board.model.toLowerCase().replace(/\s+/g, "-");

      firmwares.push({
        name: `MicroPython ${download.version} (${board.vendor} ${board.model})`,
        version: `${download.version}-${board.family}-${vendorKey}-${modelKey}`,
        url: download.url,
        releaseDate,
        description: `MicroPython ${download.version} for ${board.vendor} ${board.model}`,
        chipFamily: familyNormalized,
      });
    }
  }

  return firmwares;
}

/**
 * Filter firmwares suitable for a given chip family.
 * Normalizes chip family names for better matching.
 */
export function filterFirmwaresByChip(
  firmwares: FirmwareImage[],
  chipFamily: string
): FirmwareImage[] {
  const normalized = chipFamily.toUpperCase();

  return firmwares.filter((fw) => {
    const fwChip = fw.chipFamily.toUpperCase();

    // Exact match or generic match
    if (fwChip === normalized) return true;

    // Allow generic ESP32 for all ESP32 variants
    if (normalized.startsWith("ESP32") && fwChip === "ESP32") return true;

    return false;
  }).sort((a, b) => {
    // Sort by version (newest first), then by name
    const versionA = a.version.split("-")[0];
    const versionB = b.version.split("-")[0];
    const vCompare = versionB.localeCompare(versionA);
    return vCompare !== 0 ? vCompare : a.name.localeCompare(b.name);
  });
}

/**
 * Get all available board models for a given chip family.
 */
export function getBoardsByChipFamily(chipFamily: string) {
  const normalized = chipFamily.toLowerCase();
  return FIRMWARE_CATALOG.filter(
    (board) => board.family.toLowerCase() === normalized
  );
}

/**
 * Get firmware URLs for a specific board model.
 */
export function getFirmwaresByBoard(vendor: string, model: string) {
  return FIRMWARE_CATALOG.find(
    (board) => board.vendor === vendor && board.model === model
  );
}

/**
 * Attempt to fetch firmware from a URL with optional CORS proxy fallback.
 * Private helper function.
 */
async function fetchFirmwareData(
  url: string,
  useProxy: boolean = false,
  onProgress?: (loaded: number, total: number) => void
): Promise<ArrayBuffer> {
  // External hosts (e.g. micropython.org) don't send CORS headers, so the
  // browser can't fetch them directly. Route those through the app's own
  // same-origin server proxy, which fetches the binary server-side.
  const fetchUrl = useProxy
    ? `/api/firmware-proxy?url=${encodeURIComponent(url)}`
    : url;

  if (useProxy) {
    console.log(`[Flasher] Downloading via same-origin firmware proxy...`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
  
  const response = await fetch(fetchUrl, {
    method: "GET",
    headers: {
      "Accept": "application/octet-stream",
    },
    mode: "cors",
    credentials: "omit",
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

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

  return result.buffer;
}

/**
 * Download firmware binary from URL with retry logic and CORS proxy fallback.
 * Returns ArrayBuffer of the binary data.
 * Retries up to 3 times with exponential backoff.
 * Falls back to CORS proxy if direct fetch fails with CORS error.
 */
export async function downloadFirmware(
  url: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<ArrayBuffer> {
  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  // Absolute http(s) URLs point at external hosts and must go through the
  // same-origin server proxy (browser CORS blocks a direct fetch). Relative
  // URLs are same-origin static assets and can be fetched directly.
  const useProxy = /^https?:\/\//i.test(url);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[Flasher] Downloading firmware from: ${url} (attempt ${attempt}/${MAX_RETRIES})`);

      const buffer = await fetchFirmwareData(url, useProxy, onProgress);
      console.log(`[Flasher] Download complete: ${buffer.byteLength} bytes`);
      return buffer;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const message = lastError.message;

      console.error(`[Flasher] Download attempt ${attempt} failed: ${message}`);

      // Don't retry on definitive HTTP failures
      if (message.includes("404") || message.includes("403")) {
        break;
      }

      // Retry on network/timeout errors
      if (attempt < MAX_RETRIES && (message.includes("Failed to fetch") || message.includes("timeout") || message.includes("AbortError") || message.includes("Network"))) {
        const waitSeconds = attempt * 2;
        console.log(`[Flasher] Retrying in ${waitSeconds} seconds (attempt ${attempt + 1}/${MAX_RETRIES})...`);
        await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
        continue;
      }

      break;
    }
  }

  // All retries exhausted
  if (!lastError) {
    lastError = new Error("Download failed for unknown reason");
  }

  const message = lastError.message;
  console.error(`[Flasher] Download failed after ${MAX_RETRIES} attempts: ${message}`);
  
  // Provide more specific error messages
  if (message.includes("Failed to fetch")) {
    throw new Error("Download failed: Unable to reach the firmware server. This may be a network issue (check your internet) or the server is unavailable. Tried 3 times.");
  } else if (message.includes("NetworkError")) {
    throw new Error("Download network error: Check your internet connection. Tried 3 times. Note: Your device/serial connection is fine - this is a download/internet issue.");
  } else if (message.includes("404")) {
    throw new Error("Firmware not found (404): The firmware file may have been moved or removed from the server. Try selecting a different firmware version.");
  } else if (message.includes("Connection refused")) {
    throw new Error("Download server refused connection: The firmware download server is not responding. Try again later.");
  } else if (message.includes("timeout") || message.includes("AbortError")) {
    throw new Error("Download timeout: The server took too long to respond (>60 seconds even after 3 retries). Check your internet connection or try again later.");
  }
  
  throw new Error(`Firmware download failed after ${MAX_RETRIES} attempts: ${message}`);
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
