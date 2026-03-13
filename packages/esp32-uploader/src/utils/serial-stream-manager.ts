/**
 * Serial Stream Manager — Single Source of Truth
 *
 * All serial communication MUST go through this singleton.
 * It holds the only reader/writer pair and provides:
 *  - Operation queue (prevents "stream is locked" errors)
 *  - Raw REPL mode for reliable command execution
 *  - Listener system for REPL output streaming
 *  - Proper cleanup and error recovery
 */

import { REPL_CONTROL } from "../constants/esp32";

// ─── Types ───────────────────────────────────────────────────────────────────

export type PortMode = "idle" | "repl" | "busy";

export interface RawREPLResult {
  output: string;
  error: string;
}

type QueuedOperation = {
  execute: () => Promise<void>;
  label: string;
};

// ─── Manager ─────────────────────────────────────────────────────────────────

class SerialStreamManager {
  private port: any = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();

  // Background reader state
  private isReading = false;
  private listeners: Set<(data: string) => void> = new Set();

  // Operation queue
  private operationQueue: QueuedOperation[] = [];
  private isProcessing = false;

  // Initialization guard
  private initPromise: Promise<void> | null = null;

  // Current mode
  private _mode: PortMode = "idle";

  // ── Public Getters ───────────────────────────────────────────────────────

  get mode(): PortMode {
    return this._mode;
  }

  isReady(): boolean {
    return this.port !== null && this.reader !== null && this.writer !== null;
  }

  getPort(): any {
    return this.port;
  }

  // ── Initialization ───────────────────────────────────────────────────────

  /**
   * Initialize with a serial port. Safe to call multiple times — only runs
   * once per port. If a different port is provided, cleans up the old one
   * first.
   */
  async initialize(serialPort: any): Promise<void> {
    // Already initialized with this exact port
    if (this.port === serialPort && this.isReady()) {
      return;
    }

    // Deduplicate concurrent calls
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
    // Switching ports — tear down old one
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
      // Clean up partial locks
      this.releaseLocks();
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to acquire stream locks: ${msg}`);
    }

    this._mode = "idle";
    this.startBackgroundReader();
  }

  // ── Background Reader ────────────────────────────────────────────────────

  /**
   * Continuously reads from the serial port and broadcasts to listeners.
   * This is the ONLY place `reader.read()` is called during normal
   * operation.
   */
  private async startBackgroundReader(): Promise<void> {
    if (this.isReading) return;
    this.isReading = true;

    try {
      while (this.isReading && this.reader) {
        const { value, done } = await this.reader.read();
        if (done) break;

        if (value) {
          const text = this.decoder.decode(value, { stream: true });
          // Broadcast to all registered listeners
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

  // ── Listener Management ──────────────────────────────────────────────────

  /**
   * Register a listener that receives every chunk of data from the device.
   * Returns an unsubscribe function. Always call it when done.
   */
  addListener(callback: (data: string) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  // ── Low-level Write ──────────────────────────────────────────────────────

  /**
   * Write raw bytes. Only call this from within a queued operation.
   */
  private async write(data: string): Promise<void> {
    if (!this.writer) throw new Error("Writer not available");
    await this.writer.write(this.encoder.encode(data));
  }

  // ── Queued Operation Execution ───────────────────────────────────────────

  /**
   * Schedule an operation. Operations run sequentially — no two operations
   * can overlap, which prevents all "stream is locked" errors.
   */
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

  // ── Raw REPL Command Execution ───────────────────────────────────────────

  /**
   * Execute a MicroPython command using Raw REPL mode.
   *
   * Raw REPL protocol:
   *   1. Ctrl-A  → Enter raw REPL (device sends "raw REPL; CTRL-B to exit\r\n>")
   *   2. Send code (the Python source)
   *   3. Ctrl-D  → Execute (device sends "OK" then stdout then \x04 then stderr then \x04)
   *   4. Ctrl-B  → Back to normal REPL
   *
   * This is the RELIABLE way to execute commands — no echo, no prompts in output.
   */
  async executeRawREPL(code: string, timeout = 5000): Promise<RawREPLResult> {
    if (!this.isReady()) {
      throw new Error("Serial stream manager not initialized");
    }

    return this.enqueue<RawREPLResult>(`rawREPL: ${code.substring(0, 40)}`, async () => {
      const prevMode = this._mode;
      this._mode = "busy";

      try {
        // Collect all data during this operation
        let buffer = "";
        const onData = (data: string) => {
          buffer += data;
        };
        const unsub = this.addListener(onData);

        try {
          // Step 1: Interrupt anything running + enter raw REPL
          buffer = "";
          await this.write(REPL_CONTROL.CTRL_C);
          await delay(50);
          await this.write(REPL_CONTROL.CTRL_A);
          await waitFor(() => buffer.includes(">"), 2000);
          buffer = "";

          // Step 2: Send code + Ctrl-D to execute
          await this.write(code);
          await this.write(REPL_CONTROL.CTRL_D);

          // Step 3: Wait for the two \x04 markers that frame output and error
          // Protocol: "OK" <stdout> \x04 <stderr> \x04
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

          // Step 4: Parse output
          const result = parseRawREPLResponse(buffer);

          // Step 5: Return to normal REPL
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

  // ── Simple Write Operation (for REPL keystrokes) ─────────────────────────

  /**
   * Send data to the device without waiting for a structured response.
   * Useful for REPL interactive input (typing commands, Ctrl-C, etc.)
   */
  async sendData(data: string): Promise<void> {
    if (!this.isReady()) {
      throw new Error("Serial stream manager not initialized");
    }

    return this.enqueue("sendData", async () => {
      await this.write(data);
    });
  }

  // ── Interactive REPL Command Execution ──────────────────────────────────

  /**
   * Execute a command in normal REPL and wait until the next prompt appears.
   *
   * Keeping the full command lifecycle inside one queued operation prevents
   * file-manager raw REPL operations from interleaving mid-command.
   */
  async executeREPLCommand(command: string, timeout = 4000): Promise<string> {
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
        // Interrupt a potentially running statement before issuing a new one.
        await this.write(REPL_CONTROL.CTRL_C);
        await delay(50);

        // Ignore cleanup noise and capture only this command's response.
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

  // ── Cleanup ──────────────────────────────────────────────────────────────

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

  /**
   * Tear down all resources. Call when disconnecting from the device.
   */
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
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait until `condition()` returns true, checking every 20 ms.
 * Throws on timeout.
 */
function waitFor(condition: () => boolean, timeout: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (condition()) return resolve();
      if (Date.now() - start > timeout) return reject(new Error("Timeout waiting for device response"));
      setTimeout(check, 20);
    };
    check();
  });
}

/**
 * Parse the raw REPL response buffer.
 *
 * Expected format after "OK":
 *   <stdout>\x04<stderr>\x04
 */
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
  return normalized.includes("\n>>> ") || normalized.startsWith(">>> ");
}

// ─── Singleton ───────────────────────────────────────────────────────────────

export const serialStreamManager = new SerialStreamManager();