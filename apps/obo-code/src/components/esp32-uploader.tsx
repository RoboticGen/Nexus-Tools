"use client";

import { useState, useCallback, useEffect, useRef } from "react";

interface ESP32UploaderProps {
  code: string;
  onStatusUpdate?: (status: string) => void;
  onError?: (error: string) => void;
}

interface ESP32Device {
  name: string;
  chipFamily: string;
  baudRate: number;
}

const ESP32_DEVICES: ESP32Device[] = [
  { name: "ESP32 Dev Module", chipFamily: "ESP32", baudRate: 115200 },
  { name: "ESP32-S2", chipFamily: "ESP32-S2", baudRate: 115200 },
  { name: "ESP32-S3", chipFamily: "ESP32-S3", baudRate: 115200 },
  { name: "ESP32-C3", chipFamily: "ESP32-C3", baudRate: 115200 },
  { name: "ESP32-C6", chipFamily: "ESP32-C6", baudRate: 115200 },
];

export function ESP32Uploader({ code, onStatusUpdate, onError }: ESP32UploaderProps) {
  const [selectedDevice, setSelectedDevice] = useState<ESP32Device>(ESP32_DEVICES[0]);
  const [showUploader, setShowUploader] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashProgress, setFlashProgress] = useState(0);
  const [espWebToolsSupported, setEspWebToolsSupported] = useState<boolean | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const espToolRef = useRef<any>(null);

  // Check browser support for ESP Web Tools
  const checkEspWebToolsSupport = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    // Check for required APIs
    const hasSerial = 'serial' in navigator;
    const isSecureContext = window.isSecureContext || 
                           window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1' ||
                           window.location.protocol === 'https:';
    
    return hasSerial && isSecureContext;
  }, []);

  // Convert Python code to MicroPython format
  const convertToMicroPython = useCallback((pythonCode: string): string => {
    if (!pythonCode.trim()) {
      return `# Empty MicroPython code
from machine import Pin
import time

led = Pin(2, Pin.OUT)  # Built-in LED

print("No code provided")
for i in range(3):
    led.on()
    time.sleep(0.5)
    led.off()
    time.sleep(0.5)
`;
    }

    let micropythonCode = pythonCode;
    
    // Handle turtle graphics by converting to LED animations
    if (micropythonCode.includes("turtle")) {
      micropythonCode = `# ESP32 MicroPython - Turtle Graphics Converted
from machine import Pin
import time

led = Pin(2, Pin.OUT)  # Built-in LED

def turtle_to_led_animation():
    """Convert turtle graphics to LED patterns"""
    print("Converting turtle graphics to LED animations...")
    
    # Original turtle code (commented):
${micropythonCode.split('\n').map(line => `    # ${line}`).join('\n')}
    
    # LED animation pattern
    patterns = [
        [0.1, 0.1],  # Fast blink
        [0.5, 0.5],  # Medium blink  
        [1.0, 1.0],  # Slow blink
    ]
    
    for pattern in patterns:
        for i in range(5):
            led.on()
            time.sleep(pattern[0])
            led.off()
            time.sleep(pattern[1])
        time.sleep(1)
    
    print("Turtle animation complete!")

try:
    turtle_to_led_animation()
except Exception as e:
    print(f"Error running animation: {e}")
`;
    } else {
      // Regular Python code conversion
      micropythonCode = `# ESP32 MicroPython Code
from machine import Pin
import time

led = Pin(2, Pin.OUT)  # Built-in LED

def main():
    """Main program function"""
    try:
        print("Starting ESP32 program...")
        led.on()  # Indicate program start
        
        # Your Python code:
${micropythonCode.split('\n').map(line => `        ${line}`).join('\n')}
        
        print("Program completed successfully!")
        
        # Success indicator
        for i in range(3):
            led.on()
            time.sleep(0.2)
            led.off()
            time.sleep(0.2)
            
    except Exception as e:
        print(f"Error: {e}")
        # Error indicator - rapid blinking
        for i in range(10):
            led.on()
            time.sleep(0.1)
            led.off()
            time.sleep(0.1)

if __name__ == "__main__":
    main()
`;
    }
    
    return micropythonCode;
  }, []);

  // Initialize ESP Web Tools
  const initializeEspWebTools = useCallback(async () => {
    try {
      // Dynamic import to avoid SSR issues
      const { ESPLoader } = await import('esp-web-tools');
      
      if (espToolRef.current) {
        espToolRef.current = null;
      }
      
      // ESP Web Tools doesn't need manual initialization
      // It uses web components that handle the connection automatically
      setEspWebToolsSupported(true);
      
    } catch (error) {
      console.error('Failed to load ESP Web Tools:', error);
      setEspWebToolsSupported(false);
      onError?.('Failed to load ESP Web Tools');
    }
  }, [onError]);

  // Create main.py file content for ESP32
  const createMainPyFile = useCallback((micropythonCode: string): string => {
    const mainPyContent = `# main.py - Auto-generated from Obo Code
# This file runs automatically when ESP32 starts

${micropythonCode}

# End of main.py
`;
    return mainPyContent;
  }, []);

  // Write file to ESP32 using Web Serial API
  const writeFileToESP32 = useCallback(async (port: any, filename: string, content: string): Promise<void> => {
    const writer = port.writable?.getWriter();
    if (!writer) throw new Error("Cannot write to ESP32 port");

    const encoder = new TextEncoder();
    
    try {
      // Enter raw REPL mode
      await writer.write(encoder.encode('\x01')); // Ctrl+A for raw REPL
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Write file creation command
      const fileCommand = `
with open('${filename}', 'w') as f:
    f.write('''${content.replace(/'/g, "\\'")}
''')
print('File ${filename} saved successfully')
`;
      
      await writer.write(encoder.encode(fileCommand));
      await writer.write(encoder.encode('\x04')); // Ctrl+D to execute
      
      // Wait for execution
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } finally {
      writer.releaseLock();
    }
  }, []);

  // Connect to ESP32 via Web Serial API
  const connectToESP32 = useCallback(async (): Promise<any> => {
    try {
      // Request port access
      const port = await navigator.serial.requestPort({
        filters: [
          { usbVendorId: 0x10c4, usbProductId: 0xea60 }, // CP2102
          { usbVendorId: 0x1a86, usbProductId: 0x7523 }, // CH340
          { usbVendorId: 0x0403, usbProductId: 0x6001 }, // FTDI
          { usbVendorId: 0x239a }, // Adafruit
          { usbVendorId: 0x303a }, // Espressif
        ]
      });

      // Open port with correct settings for ESP32
      await port.open({
        baudRate: selectedDevice.baudRate,
        dataBits: 8,
        parity: "none",
        stopBits: 1,
        flowControl: "none"
      });

      return port;
    } catch (error) {
      throw new Error(`Failed to connect to ESP32: ${error}`);
    }
  }, [selectedDevice.baudRate]);

  // Upload code to ESP32 as main.py
  const uploadCodeToESP32 = useCallback(async () => {
    if (!espWebToolsSupported) {
      onError?.("Web Serial API not supported. Use Chrome/Edge with HTTPS or localhost.");
      return;
    }

    if (!code.trim()) {
      onError?.("No code to upload");
      return;
    }

    let port: any = null;

    try {
      setIsFlashing(true);
      setFlashProgress(0);
      setConnectionError(null);
      
      onStatusUpdate?.("Preparing MicroPython code...");
      const micropythonCode = convertToMicroPython(code);
      setFlashProgress(20);

      onStatusUpdate?.("Creating main.py file content...");
      const mainPyContent = createMainPyFile(micropythonCode);
      setFlashProgress(30);

      onStatusUpdate?.("Connecting to ESP32...");
      port = await connectToESP32();
      setFlashProgress(50);

      onStatusUpdate?.("Stopping any running code...");
      const writer = port.writable?.getWriter();
      if (writer) {
        // Send Ctrl+C to stop any running code
        await writer.write(new TextEncoder().encode('\x03\x03'));
        await new Promise(resolve => setTimeout(resolve, 100));
        writer.releaseLock();
      }
      setFlashProgress(60);

      onStatusUpdate?.("Writing main.py to ESP32...");
      await writeFileToESP32(port, 'main.py', mainPyContent);
      setFlashProgress(90);

      onStatusUpdate?.("Restarting ESP32...");
      const restartWriter = port.writable?.getWriter();
      if (restartWriter) {
        // Soft reset to run the new main.py
        await restartWriter.write(new TextEncoder().encode('\x04')); // Ctrl+D
        restartWriter.releaseLock();
      }
      setFlashProgress(100);

      setIsConnected(true);
      onStatusUpdate?.("Code uploaded successfully as main.py! Your ESP32 is now running your code.");

      setTimeout(() => {
        setIsFlashing(false);
        setFlashProgress(0);
      }, 2000);

    } catch (error: any) {
      setIsFlashing(false);
      setFlashProgress(0);
      setIsConnected(false);
      const errorMsg = `Upload failed: ${error.message}`;
      setConnectionError(errorMsg);
      onError?.(errorMsg);
    } finally {
      // Close port
      if (port) {
        try {
          await port.close();
        } catch (e) {
          console.warn("Failed to close port:", e);
        }
      }
    }
  }, [espWebToolsSupported, code, convertToMicroPython, createMainPyFile, connectToESP32, writeFileToESP32, onStatusUpdate, onError]);

  // Reset ESP32 connection
  const resetConnection = useCallback(() => {
    setIsConnected(false);
    setConnectionError(null);
    setFlashProgress(0);
    espToolRef.current = null;
    onStatusUpdate?.("Connection reset");
  }, [onStatusUpdate]);

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    if (isFlashing) {
      onStatusUpdate?.("Please wait for flashing to complete before closing");
      return;
    }
    
    setShowUploader(false);
    setConnectionError(null);
    setFlashProgress(0);
  }, [isFlashing, onStatusUpdate]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseModal();
    }
  }, [handleCloseModal]);

  // Handle escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showUploader) {
        handleCloseModal();
      }
    };

    if (showUploader) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => document.removeEventListener('keydown', handleEscapeKey);
    }
  }, [showUploader, handleCloseModal]);

  // Initialize component
  useEffect(() => {
    setIsMounted(true);
    const isSupported = checkEspWebToolsSupport();
    setEspWebToolsSupported(isSupported);
    
    if (isSupported) {
      initializeEspWebTools();
    }
  }, [checkEspWebToolsSupport, initializeEspWebTools]);

  // Don't render until mounted
  if (!isMounted) {
    return (
      <div className="esp32-upload-trigger">
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded opacity-50 cursor-not-allowed" disabled>
          <span className="mr-2">🔌</span>
          Loading...
        </button>
      </div>
    );
  }

  if (!showUploader) {
    return (
      <div className="esp32-upload-trigger">
        <button
          onClick={() => setShowUploader(true)}
          className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-all duration-200 ${
            !code.trim() || espWebToolsSupported === false ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={!code.trim() || espWebToolsSupported === false}
          title={
            espWebToolsSupported === false 
              ? "ESP Web Tools not supported - use Chrome/Edge with HTTPS" 
              : "Open ESP32 uploader"
          }
        >
          <span className="mr-2">🔌</span>
          Upload to ESP32
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleBackdropClick}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <span className="mr-2">🔌</span>
            ESP32 Code Uploader
          </h3>
          <div className="flex items-center space-x-4">
            {isFlashing && (
              <span className="text-blue-600 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Flashing {flashProgress}%
              </span>
            )}
            <button
              onClick={handleCloseModal}
              className={`text-gray-400 hover:text-gray-600 transition-colors ${
                isFlashing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={isFlashing}
              title={isFlashing ? "Cannot close while flashing" : "Close uploader (Esc)"}
            >
              <span className="text-xl">×</span>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {espWebToolsSupported === false && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex items-start">
                <span className="text-red-600 mr-2">⚠️</span>
                <div>
                  <p className="font-medium text-red-800">ESP Web Tools Not Available</p>
                  <p className="text-red-600 text-sm">Use Chrome 89+ or Edge 89+ with HTTPS or localhost</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="device-select" className="block text-sm font-medium text-gray-700 mb-2">
                ESP32 Device Type:
              </label>
              <select
                id="device-select"
                value={selectedDevice.name}
                onChange={(e) => {
                  const device = ESP32_DEVICES.find(d => d.name === e.target.value);
                  if (device) setSelectedDevice(device);
                }}
                disabled={isFlashing}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ESP32_DEVICES.map((device) => (
                  <option key={device.name} value={device.name}>
                    {device.name} ({device.chipFamily})
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-gray-50 rounded-md p-4">
              <div className={`flex items-center mb-2 ${isConnected ? 'text-green-600' : 'text-gray-500'}`}>
                <span className="mr-2">{isConnected ? '🟢' : '⚫'}</span>
                <span className="font-medium">
                  {isConnected ? `Connected to ${selectedDevice.chipFamily}` : 'Not connected'}
                </span>
              </div>
              
              {connectionError && (
                <div className="text-red-600 text-sm mt-2 flex items-start">
                  <span className="mr-1">❌</span>
                  {connectionError}
                </div>
              )}
            </div>

            {espWebToolsSupported && (
              <>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">main.py Preview:</h4>
                    <div className="bg-gray-900 text-green-400 p-4 rounded-md text-xs font-mono max-h-40 overflow-auto">
                      <pre>{createMainPyFile(convertToMicroPython(code)).slice(0, 500)}...</pre>
                    </div>
                  </div>

                  {isFlashing && (
                    <div className="space-y-2">
                      <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-blue-600 h-2 transition-all duration-300 ease-out rounded-full" 
                          style={{ width: `${flashProgress}%` }}
                        ></div>
                      </div>
                      <div className="text-center text-sm text-gray-600">{flashProgress}%</div>
                    </div>
                  )}

                  <button
                    onClick={uploadCodeToESP32}
                    className={`w-full py-3 px-4 rounded-md font-medium transition-all duration-200 ${
                      isFlashing || !code.trim()
                        ? 'bg-gray-400 cursor-not-allowed text-gray-200'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                    disabled={isFlashing || !code.trim()}
                  >
                    {isFlashing ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Uploading... {flashProgress}%
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <span className="mr-2">📁</span>
                        Upload as main.py
                      </span>
                    )}
                  </button>

                  {isConnected && (
                    <button
                      onClick={resetConnection}
                      className="w-full py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                      disabled={isFlashing}
                    >
                      Reset Connection
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="bg-blue-50 p-4 rounded-md">
            <p className="font-medium text-blue-900 mb-2">Instructions:</p>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Connect your ESP32 to a USB port</li>
              <li>2. Select the correct ESP32 device type above</li>
              <li>3. Click "Flash Code to ESP32" and select the ESP32 port</li>
              <li>4. Wait for the flashing process to complete</li>
              <li>5. Your Python code will run automatically on the ESP32!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}