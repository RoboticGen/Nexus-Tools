/**
 * ESP32 Types and Interfaces
 */

export interface SerialPort {
  readable?: ReadableStream<Uint8Array>;
  writable?: WritableStream<Uint8Array>;
  addEventListener: (event: string, listener: EventListener) => void;
  removeEventListener: (event: string, listener: EventListener) => void;
  open: (options: SerialPortOptions) => Promise<void>;
  close: () => Promise<void>;
  getInfo?: () => { usbVendorId?: number; usbProductId?: number };
  // Add other properties as needed
  [key: string]: any;
}

export interface ESP32Device {
  name: string;
  chipFamily: string;
  baudRate: number;
}

export interface ESP32UploaderProps {
  code: string;
  onStatusUpdate?: (status: string) => void;
  onError?: (error: string) => void;
}

export interface ESP32UploaderState {
  selectedDevice: ESP32Device;
  showUploader: boolean;
  isMounted: boolean;
  isConnected: boolean;
  isFlashing: boolean;
  flashProgress: number;
  espWebToolsSupported: boolean | null;
  connectionError: string | null;
}

export interface SerialPortOptions {
  baudRate: number;
  dataBits: number;
  parity: "none" | "even" | "odd";
  stopBits: number;
  flowControl: "none" | "hardware";
}

export interface USBFilter {
  usbVendorId: number;
  usbProductId?: number;
}
