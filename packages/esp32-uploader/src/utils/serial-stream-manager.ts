/**
 * Simple Serial Stream Manager
 * Prevents "Stream is locked" errors by sharing streams between hooks
 */

class SerialStreamManager {
  private port: any = null;
  private reader: ReadableStreamDefaultReader | null = null;
  private writer: WritableStreamDefaultWriter | null = null;
  private isLocked = false;
  private waitQueue: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];
  private listeners: Array<(data: string) => void> = [];
  private isReading = false;
  private initializePromise: Promise<void> | null = null;
  private isInitializing = false;

  /**
   * Initialize with a serial port (call once when connected)
   */
  async initialize(serialPort: any) {
    // Already initialized with this port and streams are ready
    if (this.port === serialPort && this.reader && this.writer && this.isReading) {
      return;
    }

    // If already initializing, wait for that to complete
    if (this.isInitializing) {
      if (this.initializePromise) {
        return this.initializePromise;
      }
    }

    this.isInitializing = true;

    // Create promise for concurrent initializations to wait on
    this.initializePromise = (async () => {
      try {
        // If switching to a different port, clean up first
        if (this.port && this.port !== serialPort) {
          await this.cleanup();
        }

        this.port = serialPort;

        // Check if streams can be accessed
        if (!serialPort.readable || !serialPort.writable) {
          throw new Error('Serial port does not have readable/writable streams');
        }

        // Try to get reader if we don't have one
        if (!this.reader) {
          try {
            this.reader = serialPort.readable.getReader();
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error('Failed to get reader:', msg);
            throw new Error(`Failed to get reader: ${msg}`);
          }
        }

        // Try to get writer if we don't have one
        if (!this.writer) {
          try {
            this.writer = serialPort.writable.getWriter();
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error('Failed to get writer:', msg);
            throw new Error(`Failed to get writer: ${msg}`);
          }
        }

        // Start background reading if not already reading
        if (!this.isReading) {
          this.startBackgroundReader();
        }
        console.log('Serial stream manager: initialized successfully');
      } catch (error) {
        console.error('Initialization error:', error);
        // Don't reset reader/writer here - they might still be usable
        throw error;
      } finally {
        this.isInitializing = false;
        this.initializePromise = null;
      }
    })();

    return this.initializePromise;
  }

  /**
   * Start background reader (captures all data)
   */
  private async startBackgroundReader() {
    if (this.isReading || !this.reader) return;
    
    this.isReading = true;
    console.log('Serial stream manager: Starting background reader loop...');
    
    try {
      while (this.isReading && this.reader) {
        const { value, done } = await this.reader.read();
        
        if (done) break;
        
        if (value) {
          const text = new TextDecoder().decode(value);
          console.log('Serial stream manager: Background reader received:', text.substring(0, 50));
          
          // Notify all listeners (REPL, file manager, etc.)
          this.listeners.forEach(listener => {
            try {
              listener(text);
            } catch (e) {
              console.warn('Listener error:', e);
            }
          });
        }
      }
    } catch (error) {
      console.warn('Background reader stopped:', error);
    } finally {
      this.isReading = false;
      console.log('Serial stream manager: Background reader stopped');
    }
  }

  /**
   * Execute operation with exclusive access (prevents conflicts)
   */
  async executeOperation<T>(operation: (writer: any) => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.isLocked && this.writer) {
        this.isLocked = true;
        
        operation(this.writer)
          .then(resolve)
          .catch(reject)
          .finally(() => {
            this.isLocked = false;
            this.processQueue();
          });
      } else {
        // Add to queue
        this.waitQueue.push({
          resolve: () => {
            this.isLocked = true;
            
            operation(this.writer!)
              .then(resolve)
              .catch(reject)
              .finally(() => {
                this.isLocked = false;
                this.processQueue();
              });
          },
          reject
        });
      }
    });
  }

  /**
   * Process queued operations
   */
  private processQueue() {
    if (this.waitQueue.length > 0 && !this.isLocked) {
      const next = this.waitQueue.shift();
      if (next) {
        next.resolve();
      }
    }
  }

  /**
   * Add data listener (for REPL output, etc.)
   */
  addListener(callback: (data: string) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Execute a simple REPL command and get the response
   * This is simpler and more reliable than raw REPL mode
   */
  async executeREPLCommand(command: string, timeout: number = 3000): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.writer) {
        reject(new Error("Writer not available"));
        return;
      }

      let response = "";
      let hasExited = false;
      const encoder = new TextEncoder();
      const timeoutHandle = setTimeout(() => {
        unsubscribe();
        if (!hasExited) {
          hasExited = true;
          // Return what we got even if timed out
          resolve(response);
        }
      }, timeout);

      const unsubscribe = this.addListener((data) => {
        response += data;
      });

      // Send the command with line ending
      this.executeOperation(async (writer) => {
        try {
          const cmdWithNewline = command.trim() + '\r\n';
          await writer.write(encoder.encode(cmdWithNewline));
          
          // Wait a bit for execution
          await delay(200);
          
          // Close the operation - listener will continue collecting
          // Give time for response before resolving
          await delay(300);
          
          if (!hasExited) {
            hasExited = true;
            clearTimeout(timeoutHandle);
            unsubscribe();
            resolve(response);
          }
        } catch (error) {
          if (!hasExited) {
            hasExited = true;
            clearTimeout(timeoutHandle);
            unsubscribe();
            reject(error);
          }
        }
      }).catch((error) => {
        if (!hasExited) {
          hasExited = true;
          clearTimeout(timeoutHandle);
          unsubscribe();
          reject(error);
        }
      });
    });
  }

  /**
   * Check if initialized and ready
   */
  isReady(): boolean {
    return this.port !== null && this.reader !== null && this.writer !== null;
  }

  /**
   * Get the underlying port
   */
  getPort() {
    return this.port;
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    this.isReading = false;
    this.isLocked = false;
    this.listeners = [];
    this.waitQueue = [];

    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch (e) {
        // Already released
      }
      this.reader = null;
    }

    if (this.writer) {
      try {
        this.writer.releaseLock();
      } catch (e) {
        // Already released  
      }
      this.writer = null;
    }

    this.port = null;
  }
}

/**
 * Simple delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Singleton instance
export const serialStreamManager = new SerialStreamManager();