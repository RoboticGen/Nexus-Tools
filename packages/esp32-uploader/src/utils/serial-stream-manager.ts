// All serial traffic must go through this singleton: it holds the only reader/writer pair, and a queue that serialises operations so they cannot produce "stream is locked".

import { REPL_CONTROL } from "../constants/esp32";

export type PortMode = "idle" | "repl" | "busy";

export interface RawREPLResult {
  output: string;
  error: string;
}

type QueuedOperation = {
  execute: () => Promise<void>;
  label: string;
};

class SerialStreamManager {
  private port: any = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();

  private isReading = false;
  private listeners: Set<(data: string) => void> = new Set();

  private operationQueue: QueuedOperation[] = [];
  private isProcessing = false;

  private initPromise: Promise<void> | null = null;

  private _mode: PortMode = "idle";

  get mode(): PortMode {
    return this._mode;
  }

  isReady(): boolean {
    return this.port !== null && this.reader !== null && this.writer !== null;
  }

  getPort(): any {
    return this.port;
  }

  /** Idempotent per port; a different port tears the old one down first. */
  async initialize(serialPort: any): Promise<void> {
    if (this.port === serialPort && this.isReady()) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize(serialPort);
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  private async _initialize(serialPort: any): Promise<void> {
    if (this.port && this.port !== serialPort) {
      await this.cleanup();
    }

    if (!serialPort?.readable || !serialPort?.writable) {
      throw new Error("Serial port does not have readable/writable streams");
    }

    this.port = serialPort;

    try {
      this.reader = serialPort.readable.getReader();
      this.writer = serialPort.writable.getWriter();
    } catch (err) {
      this.releaseLocks();
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to acquire stream locks: ${msg}`);
    }

    this._mode = "idle";
    this.startBackgroundReader();
  }

  /** The only place `reader.read()` is called during normal operation. */
  private async startBackgroundReader(): Promise<void> {
    if (this.isReading) return;
    this.isReading = true;

    try {
      while (this.isReading && this.reader) {
        const { value, done } = await this.reader.read();
        if (done) break;

        if (value) {
          const text = this.decoder.decode(value, { stream: true });
          for (const listener of this.listeners) {
            try {
              listener(text);
            } catch {
              // Never let a bad listener crash the read loop
            }
          }
        }
      }
    } catch {
      // Reader was cancelled or port disconnected — expected during cleanup
    } finally {
      this.isReading = false;
    }
  }

  /** Returns an unsubscribe function; always call it when done. */
  addListener(callback: (data: string) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /** Only call from within a queued operation. */
  private async write(data: string): Promise<void> {
    if (!this.writer) throw new Error("Writer not available");
    await this.writer.write(this.encoder.encode(data));
  }

  /** Operations run sequentially; overlapping them is what produces "stream is locked". */
  enqueue<T>(label: string, operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.operationQueue.push({
        label,
        execute: async () => {
          try {
            const result = await operation();
            resolve(result);
          } catch (err) {
            reject(err);
          }
        },
      });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.operationQueue.length > 0) {
      const op = this.operationQueue.shift()!;
      try {
        await op.execute();
      } catch (err) {
        console.error(`[SerialStreamManager] Operation "${op.label}" failed:`, err);
      }
    }

    this.isProcessing = false;
  }

  /** Raw REPL: Ctrl-A enter, code, Ctrl-D execute, Ctrl-B exit. Unlike the normal REPL this returns no echo or prompts in the output. */
  async executeRawREPL(code: string, timeout = 8000): Promise<RawREPLResult> {
    if (!this.isReady()) {
      throw new Error("Serial stream manager not initialized");
    }

    return this.enqueue<RawREPLResult>(`rawREPL: ${code.substring(0, 40)}`, async () => {
      const prevMode = this._mode;
      this._mode = "busy";

      try {
        let buffer = "";
        const onData = (data: string) => {
          buffer += data;
        };
        const unsub = this.addListener(onData);

        try {
          buffer = "";
          await this.write(REPL_CONTROL.CTRL_C);
          await delay(50);
          await this.write(REPL_CONTROL.CTRL_A);
          // 6s: a freshly-flashed device prints seconds of boot output before the Raw REPL prompt.
          await waitFor(() => buffer.includes(">"), 6000);
          buffer = "";

          await this.write(code);
          await this.write(REPL_CONTROL.CTRL_D);

          // Wait for the two \x04 markers framing stdout and stderr.
          await waitFor(() => {
            const okIdx = buffer.indexOf("OK");
            if (okIdx === -1) return false;
            const afterOK = buffer.substring(okIdx + 2);
            // Need two \x04 markers
            const first04 = afterOK.indexOf("\x04");
            if (first04 === -1) return false;
            const second04 = afterOK.indexOf("\x04", first04 + 1);
            return second04 !== -1;
          }, timeout);

          const result = parseRawREPLResponse(buffer);

          await this.write(REPL_CONTROL.CTRL_B);
          await delay(50);

          return result;
        } finally {
          unsub();
        }
      } finally {
        this._mode = prevMode;
      }
    });
  }

  /** Fire-and-forget write, for interactive REPL keystrokes. */
  async sendData(data: string): Promise<void> {
    if (!this.isReady()) {
      throw new Error("Serial stream manager not initialized");
    }

    return this.enqueue("sendData", async () => {
      await this.write(data);
    });
  }

  /** One queued operation for the whole lifecycle, so file-manager raw-REPL work cannot interleave mid-command. */
  async executeREPLCommand(
    command: string,
    timeout = 4000,
    options?: { interruptBeforeCommand?: boolean },
  ): Promise<string> {
    if (!this.isReady()) {
      throw new Error("Serial stream manager not initialized");
    }

    return this.enqueue<string>(`repl: ${command.substring(0, 40)}`, async () => {
      const prevMode = this._mode;
      this._mode = "repl";

      let buffer = "";
      const onData = (data: string) => {
        buffer += data;
      };
      const unsub = this.addListener(onData);

      try {
        // Skipped in continuation mode ("... " prompt), where an interrupt would abandon the partial statement.
        if (options?.interruptBeforeCommand !== false) {
          await this.write(REPL_CONTROL.CTRL_C);
          await delay(50);
        }

        buffer = "";
        await this.write(command + "\r\n");

        await waitFor(() => hasReplPrompt(buffer), timeout);
        return buffer;
      } finally {
        unsub();
        this._mode = prevMode;
      }
    });
  }

  private releaseLocks(): void {
    if (this.reader) {
      try { this.reader.releaseLock(); } catch { /* already released */ }
      this.reader = null;
    }
    if (this.writer) {
      try { this.writer.releaseLock(); } catch { /* already released */ }
      this.writer = null;
    }
  }

  /** Call when disconnecting from the device. */
  async cleanup(): Promise<void> {
    this.isReading = false;
    this._mode = "idle";
    this.operationQueue = [];
    this.isProcessing = false;
    this.listeners.clear();

    if (this.reader) {
      try { await this.reader.cancel(); } catch { /* ignore */ }
    }
    this.releaseLocks();
    this.port = null;
  }

  /** Chip id, family and revision, via Raw REPL. */
  async detectChip(): Promise<{ chipId: string; chipFamily: string; revision: number }> {
    if (!this.isReady()) {
      throw new Error("Serial stream manager not initialized");
    }

    const code = `
import binascii
import os
import machine

# Get system info and unique ID
uinfo = os.uname()
uid = binascii.hexlify(machine.unique_id()).decode()

print(f"SYSNAME={uinfo.sysname}")
print(f"MACHINE={uinfo.machine}")
print(f"UID={uid}")
`.trim();

    const result = await this.executeRawREPL(code, 3000);
    
    if (result.error) {
      throw new Error(`Failed to detect chip: ${result.error}`);
    }

    const output = result.output || "";
    const sysnameMatch = output.match(/SYSNAME=(\S+)/);
    const machineMatch = output.match(/MACHINE=(\S+)/);
    const uidMatch = output.match(/UID=([a-f0-9]+)/);

    if (!sysnameMatch) {
      throw new Error("Could not detect ESP32 platform information");
    }

    const sysname = sysnameMatch[1];
    const machine = machineMatch ? machineMatch[1] : "Unknown";
    const uid = uidMatch ? uidMatch[1] : "unknown";

    // Parse chip family from machine string (e.g., "ESP32 module with ESP32" or "esp32 with FeatherS3")
    let chipFamily = "ESP32";
    if (machine.includes("S3") || sysname.includes("S3")) {
      chipFamily = "ESP32-S3";
    } else if (machine.includes("S2") || sysname.includes("S2")) {
      chipFamily = "ESP32-S2";
    } else if (machine.includes("C3") || sysname.includes("C3")) {
      chipFamily = "ESP32-C3";
    } else if (machine.includes("C6") || sysname.includes("C6")) {
      chipFamily = "ESP32-C6";
    }

    return {
      chipId: uid,
      chipFamily,
      revision: 0, // Revision not easily detectable without esp-idf
    };
  }

  /** MicroPython firmware version currently on the device. */
  async getFirmwareVersion(): Promise<string> {
    if (!this.isReady()) {
      throw new Error("Serial stream manager not initialized");
    }

    const code = `import sys; print(sys.version)`.trim();
    const result = await this.executeRawREPL(code, 6000);

    if (result.error) {
      return "Unknown";
    }

    const versionMatch = result.output.match(/MicroPython v(\d+\.\d+\.\d+)/);
    return versionMatch ? versionMatch[1] : "Unknown";
  }

  /** Erases all files including boot scripts. */
  async eraseFlash(): Promise<void> {
    if (!this.isReady()) {
      throw new Error("Serial stream manager not initialized");
    }

    // Extended timeout: a recursive walk can take 10+ seconds. Exceptions must NOT be swallowed — a partial erase we then flash over is the failure mode this guards.
    const code = `
import os

def _rmtree(path):
    for entry in os.listdir(path):
        full = path.rstrip('/') + '/' + entry
        if os.stat(full)[0] & 0x4000:
            _rmtree(full)
            os.rmdir(full)
        else:
            os.remove(full)

print("Erasing flash...")
for entry in os.listdir('/'):
    if entry == 'sys':
        continue
    full = '/' + entry
    if os.stat(full)[0] & 0x4000:
        _rmtree(full)
        os.rmdir(full)
    else:
        os.remove(full)
print("Erase complete")
`.trim();

    const result = await this.executeRawREPL(code, 15000);

    if (result.error) {
      throw new Error(`Flash erase failed: ${result.error}`);
    }
    if (!result.output.includes("Erase complete")) {
      throw new Error("Flash erase did not complete — filesystem may be partially erased");
    }
  }

  /** Resets the MicroPython interpreter without power cycling. */
  async softReset(): Promise<void> {
    if (!this.isReady()) {
      throw new Error("Serial stream manager not initialized");
    }

    return this.enqueue("softReset", async () => {
      await this.write(REPL_CONTROL.CTRL_D);
      await delay(1000);
    });
  }

  /** Uses DTR/RTS if the platform exposes them, else falls back to soft reset. */
  async hardReset(): Promise<void> {
    if (!this.isReady()) {
      throw new Error("Serial stream manager not initialized");
    }

    try {
      if (this.port?.setSignals) {
        await this.port.setSignals({ dataTerminalReady: false });
        await delay(100);
        await this.port.setSignals({ dataTerminalReady: true });
        await delay(500);
      } else {
        // Fallback: soft reset
        await this.softReset();
      }
    } catch (err) {
      console.warn("Hard reset failed, falling back to soft reset:", err);
      await this.softReset();
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Polls `condition()` every 20 ms; throws on timeout. */
function waitFor(condition: () => boolean, timeout: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (condition()) return resolve();
      const elapsed = Date.now() - start;
      if (elapsed > timeout) {
        const seconds = (timeout / 1000).toFixed(1);
        return reject(new Error(
          `Device response timeout after ${seconds}s. Device may be unresponsive, disconnected, or have poor USB connection.`
        ));
      }
      setTimeout(check, 20);
    };
    check();
  });
}

/** Raw REPL response after "OK" is `<stdout>\x04<stderr>\x04`. */
function parseRawREPLResponse(buffer: string): RawREPLResult {
  const okIdx = buffer.indexOf("OK");
  if (okIdx === -1) {
    return { output: "", error: "No OK marker in raw REPL response" };
  }

  const afterOK = buffer.substring(okIdx + 2);
  const first04 = afterOK.indexOf("\x04");
  const second04 = afterOK.indexOf("\x04", first04 + 1);

  const output = first04 >= 0 ? afterOK.substring(0, first04).trim() : "";
  const error =
    first04 >= 0 && second04 >= 0
      ? afterOK.substring(first04 + 1, second04).trim()
      : "";

  return { output, error };
}

function hasReplPrompt(buffer: string): boolean {
  const normalized = buffer.replace(/\r/g, "");
  // Accepts primary and continuation prompts; the trailing space varies between firmware builds.
  return /(^|\n)(>>>|\.\.\.)(\s|$)/.test(normalized);
}

export const serialStreamManager = new SerialStreamManager();