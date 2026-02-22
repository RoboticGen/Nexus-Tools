"use client";

import { DeleteOutlined, StopOutlined, LinkOutlined, DisconnectOutlined } from "@ant-design/icons";
import { useESP32Uploader, ESP32REPL, ESP32FileManager } from "@nexus-tools/esp32-uploader";
import { Button as UIButton } from "@nexus-tools/ui";
import { Tabs, Space, Button } from "antd";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";

interface OutputTerminalProps {
  output: string;
  onClear: () => void;
  onStop: () => void;
  isRunning: boolean;
  code?: string;
  onStatusUpdate?: (status: string) => void;
  onError?: (error: string) => void;
  onOpenFileInEditor?: (filename: string, content: string) => void;
  onSaveFileToDevice?: (saveFunc: (filename: string, content: string) => Promise<void>) => void;
  onConnectionStatusChange?: (isConnected: boolean) => void;
}

export function OutputTerminal({
  output,
  onClear,
  onStop,
  isRunning,
  code = "",
  onStatusUpdate,
  onError,
  onOpenFileInEditor,
  onSaveFileToDevice,
  onConnectionStatusChange,
}: OutputTerminalProps) {
  const [activeTab, setActiveTab] = useState<string>("output");
  const [replReady, setReplReady] = useState(false);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const autoDetectionTriggeredRef = useRef(false);
  const fileManagerRefreshRef = useRef<(() => void) | null>(null);

  const handleConnectionEstablished = useCallback(async (_port: any) => {
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

  if (!isMounted) {
    return (
      <div className="output-panel">
        <div style={{ padding: "1rem", textAlign: "center" }}>
          Loading ESP32 tools...
        </div>
      </div>
    );
  }

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

  const filesTab = (
    <div className="tab-content-wrapper">
      <ESP32FileManager
        serialPort={serialPort}
        isConnected={isConnected}
        onError={onError}
        onOpenFileInEditor={onOpenFileInEditor}
        onRefreshReady={(refreshFunc) => {
          fileManagerRefreshRef.current = refreshFunc;
        }}
      />
    </div>
  );

  return (
    <div className="output-panel">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "output",
            label: "Output",
            children: (
              <div className="tab-content-wrapper">
                <div className="panel-header">
                  <div className="button-group" style={{ display: "flex", gap: "8px" }}>
                    <UIButton
                      icon={<DeleteOutlined />}
                      onClick={onClear}
                      disabled={isRunning}
                      title={isRunning ? "Stop execution first to clear output" : "Clear Output"}
                    >
                      Clear
                    </UIButton>
                    <UIButton
                      variant={isRunning ? "destructive" : "default"}
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
                    className="terminal-output"
                    value={output || "Python \n>>> "}
                    readOnly
                    rows={10}
                  />
                </div>
              </div>
            ),
          },
          {
            key: "repl",
            label: "REPL",
            disabled: !canShowAdvancedFeatures,
            children: replTab,
          },
          {
            key: "files",
            label: "File Manager",
            disabled: !isConnected,
            children: filesTab,
          },
        ]}
      />
    </div>
  );
}

