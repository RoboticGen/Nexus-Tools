"use client";

import { DeleteOutlined, StopOutlined, LinkOutlined, DisconnectOutlined } from "@ant-design/icons";
import { useESP32Uploader, ESP32REPL, ESP32FileManager } from "@nexus-tools/esp32-uploader";
import { Button as UIButton } from "@nexus-tools/ui";
import { Tabs, Space, Button } from "antd";
import { useState, useMemo, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from "react";


interface ESP32OutputPanelProps {
  /** Terminal output text (for output tab) */
  output?: string;
  /** Callback to clear output terminal */
  onClear: () => void;
  /** Callback to stop code execution */
  onStop: () => void;
  /** Python code to upload to device */
  code?: string;
  /** Status update callback */
  onStatusUpdate?: (status: string) => void;
  /** Error callback */
  onError?: (error: string) => void;
  /** Callback when file is opened in editor */
  onOpenFileInEditor?: (filename: string, content: string) => void;
  /** Callback to provide saveFileToDevice function to parent */
  onSaveFileToDevice?: (saveFunc: (filename: string, content: string) => Promise<void>) => void;
  /** Callback when connection status changes */
  onConnectionStatusChange?: (isConnected: boolean) => void;
  /** Callback when serial port is available */
  onSerialPortChange?: (serialPort: SerialPort | null) => void;
  /** Custom CSS class name */
  className?: string;
  /** ID for the output terminal textarea */
  terminalId?: string;
}

export interface ESP32OutputPanelHandle {
  switchToUploaderTab: () => void;
  connectToDevice: () => void;
  resetConnection: () => void;
}

/**
 * Shared ESP32 Output Panel with tabs for Output, Uploader, REPL, and File Manager.
 * Used in both obo-code and obo-blocks applications.
 */
export const ESP32OutputPanel = forwardRef<ESP32OutputPanelHandle, ESP32OutputPanelProps>(
  (
    {
      output,
      onClear,
      onStop,
      code = "",
      onStatusUpdate,
      onError,
      onOpenFileInEditor,
      onSaveFileToDevice,
      onConnectionStatusChange,
      onSerialPortChange,
      className = "output",
      terminalId = "terminal-output",
    }: ESP32OutputPanelProps,
    ref
  ) => {
  const [activeTab, setActiveTab] = useState<string>("output");
  const [replReady, setReplReady] = useState(false);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const autoDetectionTriggeredRef = useRef(false);
  const fileManagerRefreshRef = useRef<(() => void) | null>(null);

  const handleConnectionEstablished = useCallback(async (_port: unknown) => {
    if (autoDetectionTriggeredRef.current) return;
    autoDetectionTriggeredRef.current = true;
    
    try {
      setAutoDetecting(true);
      onStatusUpdate?.("Initializing REPL...");
      await new Promise(resolve => setTimeout(resolve, 500));
      setReplReady(true);
      onStatusUpdate?.("ESP32 ready! Files and REPL are now available.");
    } catch (error) {
      console.warn("Auto-detection failed:", error);
      onError?.("Failed to auto-detect ESP32 features");
    } finally {
      setAutoDetecting(false);
    }
  }, [onStatusUpdate, onError]);

  const {
    selectedDevice,
    isMounted,
    isConnected,
    serialPort,
    isFlashing,
    espSupported,
    connectionError,
    connectToDevice,
    resetConnection,
    saveFileToDevice,
  } = useESP32Uploader({ 
    code, 
    onStatusUpdate, 
    onError,
    onConnectionEstablished: handleConnectionEstablished 
  });

  useImperativeHandle(ref, () => ({
    switchToUploaderTab: () => {
      setActiveTab("uploader");
    },
    connectToDevice,
    resetConnection,
  }), [connectToDevice, resetConnection]);

  const canShowAdvancedFeatures = useMemo(() => {
    return Boolean(espSupported) && Boolean(serialPort);
  }, [espSupported, serialPort]);

  useEffect(() => {
    // Only reset REPL state when actually disconnected, not on tab switches
    if (!isConnected) {
      autoDetectionTriggeredRef.current = false;
      setReplReady(false);
      setAutoDetecting(false);
    }
  }, [isConnected]);

  // Pass saveFileToDevice function to parent component
  useEffect(() => {
    if (onSaveFileToDevice && saveFileToDevice) {
      // Wrap saveFileToDevice to also refresh file manager after saving
      const wrappedSaveFileToDevice = async (filename: string, content: string) => {
        await saveFileToDevice(filename, content);
        // Refresh file manager after successful save
        if (fileManagerRefreshRef.current) {
          setTimeout(() => {
            fileManagerRefreshRef.current?.();
          }, 500);
        }
      };
      onSaveFileToDevice(wrappedSaveFileToDevice);
    }
  }, [saveFileToDevice, onSaveFileToDevice]);

  // Update parent about connection status
  useEffect(() => {
    onConnectionStatusChange?.(isConnected);
  }, [isConnected, onConnectionStatusChange]);

  // Update parent about serial port availability
  useEffect(() => {
    onSerialPortChange?.(serialPort || null);
  }, [serialPort, onSerialPortChange]);

  if (!isMounted) {
    return (
      <div className={className} id={className}>
        <div style={{ padding: "1rem", textAlign: "center" }}>
          Loading ESP32 tools...
        </div>
      </div>
    );
  }

  const uploaderTab = (
    <div className="tab-content-wrapper">
      {espSupported === false && (
        <div style={{ padding: "1rem", color: "#d32f2f" }}>
          <strong>ESP Web Tools Not Available</strong>
          <p>Use Chrome 89+ or Edge 89+ with HTTPS or localhost</p>
        </div>
      )}

      {espSupported && (
        <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem", height: "100%", overflow: "auto" }}>
          {/* Connection Status */}
          <div style={{ padding: "0.75rem", background: "rgba(255, 255, 255, 0.02)", borderRadius: "4px" }}>
            <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.875rem", fontWeight: 600 }}>Connection</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ fontSize: "0.9rem", color: isConnected ? "#059669" : "#dc2626" }}>
                {isConnected ? `✓ Connected to ${selectedDevice?.chipFamily}` : "✗ Not Connected"}
              </div>

              {connectionError && (
                <div style={{ fontSize: "0.85rem", color: "#dc2626" }}>
                  {connectionError}
                </div>
              )}

              {autoDetecting && (
                <div style={{ fontSize: "0.85rem", color: "#1890ff" }}>
                  Auto-detecting ESP32 features...
                </div>
              )}

              {isConnected && replReady && !autoDetecting && (
                <div style={{ fontSize: "0.85rem", color: "#059669" }}>
                  ✓ REPL ready!
                </div>
              )}

              <div>
                {!isConnected ? (
                  <Button
                    type="primary"
                    icon={<LinkOutlined />}
                    onClick={connectToDevice}
                    disabled={isFlashing}
                    block
                  >
                    Connect Device
                  </Button>
                ) : (
                  <Button
                    danger
                    icon={<DisconnectOutlined />}
                    onClick={resetConnection}
                    disabled={isFlashing}
                    block
                  >
                    Disconnect
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const replTab = (
    <div className="tab-content-wrapper">
      {!canShowAdvancedFeatures && (
        <div style={{ padding: "1rem" }}>
          <div style={{ fontSize: "0.9rem", marginBottom: "1rem" }}>
            Connect your device first to access the REPL.
          </div>
          <Space style={{ width: "100%" }}>
            {!isConnected ? (
              <Button
                type="primary"
                icon={<LinkOutlined />}
                onClick={connectToDevice}
                disabled={isFlashing}
                block
              >
                Connect Device
              </Button>
            ) : (
              <Button
                danger
                icon={<DisconnectOutlined />}
                onClick={resetConnection}
                disabled={isFlashing}
                block
              >
                Disconnect
              </Button>
            )}
          </Space>
        </div>
      )}

      {canShowAdvancedFeatures && (
        <>
          {isFlashing && (
            <div style={{ padding: "1rem", background: "#fff3cd", borderBottom: "1px solid #ffc107" }}>
              REPL is disabled during code upload. Please wait for upload to complete.
            </div>
          )}
          <ESP32REPL
            serialPort={serialPort}
            isConnected={isConnected}
            onError={onError}
          />
        </>
      )}
    </div>
  );

  const outputTab = (
    <div className="tab-content-wrapper">
      <div className="panel-header">
        <div className="button-group" style={{ display: "flex", gap: "8px" }}>
          <UIButton
            icon={<DeleteOutlined />}
            onClick={onClear}
            title="Clear Output"
          >
            Clear
          </UIButton>
          <UIButton
            icon={<StopOutlined />}
            onClick={onStop}
            title="Stop Execution"
          >
            Stop
          </UIButton>
        </div>
      </div>
      <div className="terminal-wrapper">
        <textarea
          id={terminalId}
          className="terminal-output"
          readOnly
          rows={10}
          value={output || ""}
          defaultValue={output !== undefined ? undefined : ""}
        />
      </div>
    </div>
  );

  return (
    <div className={className} id={className}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "output",
            label: "Output",
            children: outputTab,
          },
          {
            key: "uploader",
            label: "Uploader",
            children: uploaderTab,
          },
          {
            key: "repl",
            label: "REPL",
            disabled: !canShowAdvancedFeatures,
            children: replTab,
          },
        ]}
      />
    </div>
  );
  }
);
