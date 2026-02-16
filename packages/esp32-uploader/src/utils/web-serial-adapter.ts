/**
 * Web Serial Port Adapter
 * Provides the interface expected by FileSystemManager
 */

export class WebSerialPortAdapter {
  private port: any;
  private reader: ReadableStreamDefaultReader | null = null;
  private writer: WritableStreamDefaultWriter | null = null;
  private readBuffer: Uint8Array = new Uint8Array(0);
  private isReading = false;
  
  // Properties expected by FileSystemManager
  prevRecvCbk: ((data: string) => void) | null = null;
  emit: boolean = false;
  receivedData: string = '';

  constructor(port: any) {
    this.port = port;
  }

  /**
   * Start a transaction (exclusive access to port)
   */
  async startTransaction(): Promise<() => Promise<void>> {
    // Check if we already have active readers/writers
    if (this.reader || this.writer) {
      throw new Error('Transaction already in progress');
    }

    try {
      // Check if the streams are available and not locked
      if (!this.port.readable || !this.port.writable) {
        throw new Error('Serial port streams are not available');
      }

      // Try to get reader and writer
      this.reader = this.port.readable.getReader();
      this.writer = this.port.writable.getWriter();

      // Start background reading to buffer data
      this.startBackgroundReading();

      // Return release function
      return async () => {
        await this.releaseTransaction();
      };
    } catch (error) {
      // Clean up on error
      await this.releaseTransaction();
      
      if (error instanceof Error && error.message.includes('locked')) {
        throw new Error('Serial port is already in use. Please disconnect other operations first.');
      }
      throw error;
    }
  }

  /**
   * Release transaction and clean up resources
   */
  private async releaseTransaction(): Promise<void> {
    this.stopBackgroundReading();
    
    if (this.reader) {
      try {
        this.reader.releaseLock();
      } catch (e) {
        console.warn('Failed to release reader lock:', e);
      }
      this.reader = null;
    }
    
    if (this.writer) {
      try {
        this.writer.releaseLock();
      } catch (e) {
        console.warn('Failed to release writer lock:', e);
      }
      this.writer = null;
    }
    
    this.readBuffer = new Uint8Array(0);
    this.receivedData = '';
  }

  /**
   * Write data to the port
   */
  async write(data: string): Promise<void> {
    if (!this.writer) {
      throw new Error('Port not in transaction mode');
    }
    
    const encoder = new TextEncoder();
    await this.writer.write(encoder.encode(data));
  }

  /**
   * Read until a specific pattern is found
   */
  async readUntil(pattern: string, timeout = 10000): Promise<string> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      // Check if pattern exists in current buffer
      const bufferString = new TextDecoder().decode(this.readBuffer);
      const patternIndex = bufferString.indexOf(pattern);
      
      if (patternIndex !== -1) {
        // Pattern found, return data up to and including pattern
        const result = bufferString.substring(0, patternIndex + pattern.length);
        
        // Remove consumed data from buffer
        const consumedBytes = new TextEncoder().encode(result);
        this.readBuffer = this.readBuffer.slice(consumedBytes.length);
        
        return result;
      }
      
      // Wait a bit before checking again
      await this.delay(10);
    }
    
    throw new Error(`Timeout waiting for pattern: ${pattern}`);
  }

  /**
   * Read exactly n bytes
   */
  async readExactly(count: number, timeout = 10000): Promise<string> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (this.readBuffer.length >= count) {
        // We have enough bytes
        const result = this.readBuffer.slice(0, count);
        this.readBuffer = this.readBuffer.slice(count);
        
        // Convert to string for compatibility with FileSystemManager expectations
        return new TextDecoder().decode(result);
      }
      
      // Wait a bit before checking again
      await this.delay(10);
    }
    
    throw new Error(`Timeout waiting for ${count} bytes`);
  }

  /**
   * Flush input buffer
   */
  async flushInput(): Promise<void> {
    // Clear the read buffer
    this.readBuffer = new Uint8Array(0);
    this.receivedData = '';
  }

  /**
   * Start reading data in background to fill buffer
   */
  private startBackgroundReading(): void {
    this.isReading = true;
    this.backgroundRead();
  }

  /**
   * Stop background reading
   */
  private stopBackgroundReading(): void {
    this.isReading = false;
  }

  /**
   * Background reading loop
   */
  private async backgroundRead(): Promise<void> {
    try {
      while (this.isReading && this.reader) {
        const { value, done } = await this.reader.read();
        
        if (done) {
          break;
        }
        
        if (value) {
          // Append new data to buffer
          const newBuffer = new Uint8Array(this.readBuffer.length + value.length);
          newBuffer.set(this.readBuffer);
          newBuffer.set(value, this.readBuffer.length);
          this.readBuffer = newBuffer;
          
          // Update receivedData for compatibility
          const newText = new TextDecoder().decode(value);
          this.receivedData += newText;
          
          // Call callback if set
          if (this.prevRecvCbk && this.emit) {
            this.prevRecvCbk(newText);
          }
        }
      }
    } catch (error) {
      console.warn('Background reading stopped:', error);
    }
  }

  /**
   * Check if the port is currently locked/in use
   * More accurately checks if the WebSerial streams are actually locked
   */
  isLocked(): boolean {
    try {
      // Try to check if streams are actually locked by the browser
      // If we can't get readers, they're locked by something else
      if (!this.port?.readable || !this.port?.writable) {
        return true;
      }
      
      // If we have our own readers/writers, we're locked
      if (this.reader || this.writer) {
        return true;
      }
      
      return false;
    } catch (error) {
      // If we can't determine the state, assume locked
      return true;
    }
  }

  /**
   * Force cleanup of any stuck locks (emergency cleanup)
   */
  async forceCleanup(): Promise<void> {
    console.warn('Force cleaning up WebSerialPortAdapter locks...');
    
    this.stopBackgroundReading();
    
    if (this.reader) {
      try {
        this.reader.cancel();
      } catch (e) {
        console.warn('Failed to cancel reader:', e);
      }
      try {
        this.reader.releaseLock();
      } catch (e) {
        console.warn('Failed to release reader lock:', e);
      }
      this.reader = null;
    }
    
    if (this.writer) {
      try {
        await this.writer.abort();
      } catch (e) {
        console.warn('Failed to abort writer:', e);
      }
      try {
        this.writer.releaseLock();
      } catch (e) {
        console.warn('Failed to release writer lock:', e);
      }
      this.writer = null;
    }
    
    this.readBuffer = new Uint8Array(0);
    this.receivedData = '';
  }

  /**
   * Wait for port to be available (not locked)
   */
  async waitForAvailable(timeout = 30000): Promise<void> {
    const startTime = Date.now();
    
    while (this.isLocked() && Date.now() - startTime < timeout) {
      await this.delay(100);
    }
    
    if (this.isLocked()) {
      // Try force cleanup once before giving up
      console.log('Port appears locked, attempting force cleanup...');
      await this.forceCleanup();
      
      // Wait a bit more after cleanup
      await this.delay(1000);
      
      if (this.isLocked()) {
        throw new Error('Timeout waiting for serial port to become available');
      }
    }
  }

  /**
   * Simple delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}