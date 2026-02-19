"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Button as UIButton } from "@nexus-tools/ui";
import { DeleteOutlined, StopOutlined, LinkOutlined, DisconnectOutlined, UploadOutlined } from "@ant-design/icons";
import { Tabs, Space, Progress, Button } from "antd";
import { useESP32Uploader, ESP32REPL, ESP32FileManager } from "@nexus-tools/esp32-uploader";

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
}: OutputTerminalProps) {
  const [activeTab, setActiveTab] = useState<string>("output");
  const [replReady, setReplReady] = useState(false);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const autoDetectionTriggeredRef = useRef(false);

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
    flashProgress,
    espSupported,
    connectionError,
    uploadCode,
    saveFileToDevice,
    connectToDevice,
    resetConnection,
  } = useESP32Uploader({ 
    code, 
    onStatusUpdate, 
    onError,
    onConnectionEstablished: handleConnectionEstablished 
  });

  const canShowAdvancedFeatures = useMemo(() => {
    return Boolean(espSupported) && Boolean(serialPort);
  }, [espSupported, serialPort]);

  const handleUploadClick = useCallback(() => {
    uploadCode()
      .then(() => {
        // After successful upload, open the file in code editor
        onOpenFileInEditor?.("main.py", code);
      })
      .catch((error) => {
        onError?.(error?.message || "Upload failed");
      });
  }, [uploadCode, code, onError, onOpenFileInEditor]);

  // Notify parent about saveFileToDevice function
  useEffect(() => {
    onSaveFileToDevice?.(saveFileToDevice);
  }, [saveFileToDevice, onSaveFileToDevice]);

  useEffect(() => {
    if (!isConnected || !serialPort) {
      autoDetectionTriggeredRef.current = false;
      setReplReady(false);
      setAutoDetecting(false);
    }
  }, [isConnected, serialPort]);

  if (!isMounted) {
    return (
      <div className="output-panel">
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

          {/* Device Details or Upload Section */}
          {isConnected ? (
            <div style={{ padding: "0.75rem", background: "rgba(255, 255, 255, 0.02)", borderRadius: "4px", flexShrink: 0 }}>
              <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.875rem", fontWeight: 600 }}>Device Information</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.875rem" }}>
                <div style={{ paddingBottom: "0.5rem", borderBottom: "1px solid var(--panel-border)" }}>
                  <div style={{ color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Chip Family</div>
                  <div style={{ color: "var(--text-primary)", fontWeight: "500", fontFamily: "monospace" }}>
                    {selectedDevice?.chipFamily}
                  </div>
                </div>
                <div style={{ paddingBottom: "0.5rem", borderBottom: "1px solid var(--panel-border)" }}>
                  <div style={{ color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Device Name</div>
                  <div style={{ color: "var(--text-primary)", fontWeight: "500", fontFamily: "monospace" }}>
                    {selectedDevice?.name}
                  </div>
                </div>
                <div style={{ paddingBottom: "0.5rem", borderBottom: "1px solid var(--panel-border)" }}>
                  <div style={{ color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Baud Rate</div>
                  <div style={{ color: "var(--text-primary)", fontWeight: "500", fontFamily: "monospace" }}>
                    {selectedDevice?.baudRate} bps
                  </div>
                </div>
                <div>
                  <div style={{ color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Status</div>
                  <div style={{ color: "var(--btn-run)", fontWeight: "500", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--btn-run)" }}></span>
                    Connected
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: "0.75rem", background: "rgba(255, 255, 255, 0.02)", borderRadius: "4px", flexShrink: 0 }}>
              <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.875rem", fontWeight: 600 }}>Code Upload</h4>

              {isFlashing && (
                <div style={{ marginBottom: "1rem" }}>
                  <Progress percent={flashProgress} status="active" />
                </div>
              )}

              <Button
                type="primary"
                size="large"
                icon={<UploadOutlined />}
                onClick={handleUploadClick}
                disabled={!code.trim() || isFlashing || !isConnected}
                loading={isFlashing}
                block
              >
                {isFlashing ? `Uploading... ${flashProgress}%` : "Upload Code"}
              </Button>

              {!code.trim() && (
                <p style={{ fontSize: "0.8rem", marginTop: "0.5rem", color: "#666" }}>
                  Write some code to enable upload
                </p>
              )}
            </div>
          )}

          {/* Instructions */}
          <div style={{ padding: "0.75rem", background: "rgba(255, 255, 255, 0.02)", borderRadius: "4px", flexShrink: 0 }}>
            <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.875rem", fontWeight: 600 }}>Instructions</h4>
            <ol style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.8rem", lineHeight: 1.5 }}>
              <li style={{ marginBottom: "0.5rem" }}>Select your ESP32 device type from the dropdown</li>
              <li style={{ marginBottom: "0.5rem" }}>Click "Connect Device" to establish connection</li>
              <li style={{ marginBottom: "0.5rem" }}>Write or paste your Python code in the editor</li>
              <li>Click "Upload Code"</li>
            </ol>
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

