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

// ─── Flasher Types ───────────────────────────────────────────────────────────

export interface ChipInfo {
  chipId: string;
  chipFamily: string;
  chipModel: string;
  revision: number;
  features: string[];
}

export interface FirmwareImage {
  name: string;
  version: string;
  url: string;
  checksumSha256?: string;
  releaseDate: string;
  description: string;
  chipFamily: string;
}

export interface FlashOperation {
  startTime: number;
  estimatedDurationMs: number;
  bytesTotal: number;
  bytesWritten: number;
  percentComplete: number;
}

export type FlasherPhase = "idle" | "detecting" | "erasing" | "flashing" | "verifying" | "rollback" | "completed" | "error";

export interface FlasherState {
  phase: FlasherPhase;
  isFlashing: boolean;
  isRecoveryMode: boolean;
  progress: number;
  estimatedTimeRemaining: number; // in seconds
  currentOperation: string;
  error: string | null;
  chipInfo: ChipInfo | null;
  selectedFirmware: FirmwareImage | null;
  customFirmwareBinary: ArrayBuffer | null;
  customFirmwareName: string | null;
  backupBinary: ArrayBuffer | null;
  operationLog: string[];
}

export interface ESP32FlasherProps {
  serialPort: any;
  isConnected?: boolean;
  onStatusUpdate?: (status: string) => void;
  onError?: (error: string) => void;
}
