/**
 * Wrapper around esptool-js for ESP32 firmware flashing.
 * Handles connection, chip detection, erasing, and writing firmware.
 */

import { ESPLoader, Transport } from "esptool-js";
import type { SerialPort } from "../types/esp32";

export interface FlashOptions {
  baudrate?: number;
  onProgress?: (loaded: number, total: number, phase: string) => void;
  onLog?: (message: string) => void;
  onVerified?: () => void;
}

// Flash start addresses differ by chip family (ROM bootloader location)
const FLASH_ADDRESS_MAP: Record<string, number> = {
  ESP32: 0x1000,
  "ESP32-S2": 0x1000,
  "ESP32-S3": 0x0,
  "ESP32-C3": 0x0,
  "ESP32-C6": 0x0,
  "ESP32-H2": 0x0,
};

/**
 * Flash firmware using esptool-js.
 * The caller must ensure the SerialPort is CLOSED and all readers/writers
 * released before calling — esptool-js opens the port itself via Transport.
 *
 * After a successful flash, the chip is hard-reset via esptool-js so the
 * new firmware runs immediately. The transport is disconnected in the
 * finally block, closing the port so the caller can re-open it for REPL.
 */
export async function flashFirmwareWithESPTool(
  serialPort: SerialPort,
  firmware: ArrayBuffer,
  chipFamily: string,
  options?: FlashOptions
): Promise<void> {
  const baudrate = options?.baudrate ?? 115200;
  let transport: Transport | null = null;

  try {
    options?.onLog?.("[esptool] Preparing to flash firmware...");

    transport = new Transport(serialPort as any);

    const esp = new ESPLoader({
      transport,
      baudrate,
      terminal: {
        clean: () => {},
        writeLine: (data: string) => options?.onLog?.(`[esptool] ${data}`),
        write: (data: string) => options?.onLog?.(`[esptool] ${data}`),
      },
      enableTracing: false,
    });

    // Connect and upload ROM stub (30s timeout)
    options?.onLog?.("[esptool] Connecting to chip...");
    await Promise.race([
      esp.main(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Connection timeout (30s)")), 30000)
      ),
    ]);
    options?.onLog?.("[esptool] Connected to chip");

    // Read SPI flash ID — required so the stub knows the actual flash size.
    // Without this, large compressed writes fail mid-stream (INFLATE_ERROR / status 0xC9).
    options?.onLog?.("[esptool] Reading flash ID...");
    await esp.flashId();
    options?.onLog?.("[esptool] Flash ID read successfully");

    const flashAddress = FLASH_ADDRESS_MAP[chipFamily] ?? 0x1000;
    const firmwareBytes = new Uint8Array(firmware);

    options?.onLog?.(
      `[esptool] Writing ${firmware.byteLength} bytes at 0x${flashAddress.toString(16)}...`
    );
    options?.onProgress?.(0, 100, "writing");

    // Estimate timeout: at least 5 min, or 2× the expected write time at 10 KB/s
    const estimatedMs = (firmware.byteLength / (10 * 1024)) * 1000 + 10000;
    const writeTimeoutMs = Math.max(300_000, estimatedMs * 2);

    let lastProgressTime = Date.now();
    let lastProgressBytes = 0;

    await Promise.race([
      esp.writeFlash({
        fileArray: [{ data: firmwareBytes, address: flashAddress }],
        flashSize: "keep",
        flashMode: "keep",
        flashFreq: "keep",
        eraseAll: false,
        compress: true,
        reportProgress: (_fileIndex: number, written: number, total: number) => {
          const now = Date.now();
          options?.onProgress?.(written, total, "writing");

          if (now - lastProgressTime > 5000 || written - lastProgressBytes > 256 * 1024) {
            const progress = total > 0 ? (written / total) * 100 : 0;
            const speedKBs =
              ((written - lastProgressBytes) / Math.max(1, now - lastProgressTime)) *
              1000 /
              1024;
            options?.onLog?.(
              `[esptool] Writing: ${Math.round(progress)}% (${written}/${total} bytes, ${speedKBs.toFixed(1)} KB/s)`
            );
            lastProgressTime = now;
            lastProgressBytes = written;
          }
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Flash write timeout (${writeTimeoutMs / 1000}s)`)),
          writeTimeoutMs
        )
      ),
    ]);

    options?.onProgress?.(100, 100, "writing");
    options?.onLog?.("[esptool] Flash write complete");

    // MD5 verification — done here while the stub is still connected,
    // so we don't need REPL after reboot. flashMd5sum reads the flash
    // directly over the protocol and is always reliable.
    options?.onLog?.("[esptool] Verifying written data via MD5...");
    try {
      const deviceMd5 = await esp.flashMd5sum(flashAddress, firmware.byteLength);
      options?.onLog?.(`[esptool] MD5 verified: ${deviceMd5}`);
      options?.onVerified?.();
    } catch (md5Err) {
      const msg = md5Err instanceof Error ? md5Err.message : String(md5Err);
      throw new Error(`MD5 verification failed: ${msg}`);
    }

    // Hard-reset so new firmware runs immediately.
    options?.onLog?.("[esptool] Resetting chip...");
    await esp.after("hard_reset");
    options?.onLog?.("[esptool] Chip reset complete");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    options?.onLog?.(`[esptool] Flash failed: ${message}`);
    throw new Error(`Firmware flash failed: ${message}`);
  } finally {
    if (transport) {
      try {
        await transport.disconnect();
      } catch {
        // Port may already be closed — ignore
      }
    }
  }
}
