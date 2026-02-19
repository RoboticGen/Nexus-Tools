/**
 * ESP32 Uploader Sidebar Component
 * Inline version for sidebar use (no modal)
 */

"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Tabs, Button, Space, Progress } from "antd";
import { LinkOutlined, DisconnectOutlined, UploadOutlined } from "@ant-design/icons";

import { useESP32Uploader } from "../hooks/use-esp32-uploader";
import { translateErrorMessage } from "../utils/error-messages";
import { ESP32REPL } from "./ESP32REPL";
import { ESP32FileManager } from "./ESP32FileManager";

interface ESP32UploaderSidebarProps {
  code: string;
  onStatusUpdate?: (status: string) => void;
  onError?: (error: string) => void;
}

export function ESP32UploaderSidebar({ code, onStatusUpdate, onError }: ESP32UploaderSidebarProps) {
  const [activeView, setActiveView] = useState<"uploader" | "repl" | "files">("uploader");
  const [replReady, setReplReady] = useState(false);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const autoDetectionTriggeredRef = useRef(false);
  
  // Handle when ESP32 connection is established
  const handleConnectionEstablished = useCallback(async (_port: any) => {
    if (autoDetectionTriggeredRef.current) return; // Prevent multiple triggers
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
    // State
    selectedDevice,
    isMounted,
    isConnected,
    serialPort,
    isFlashing,
    flashProgress,
    espSupported,
    connectionError,
    uploadCode,
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

  // Handle upload with proper error handling
  const handleUploadClick = useCallback(() => {
    uploadCode().catch((error) => {
      const userMessage = translateErrorMessage(error);
      onError?.(userMessage);
    });
  }, [uploadCode, onError]);

  // Reset auto-detection state when disconnected
  useEffect(() => {
    if (!isConnected || !serialPort) {
      autoDetectionTriggeredRef.current = false;
      setReplReady(false);
      setAutoDetecting(false);
      setActiveView("uploader");
    }
  }, [isConnected, serialPort]);

  if (!isMounted) {
    return (
      <div className="esp32-sidebar-loading">
        <div className="loading-spinner"></div>
        <span>Loading ESP32 tools...</span>
      </div>
    );
  }

  return (
    <div className="esp32-sidebar">
      {/* Browser Warning */}
      {espSupported === false && (
        <div className="esp32-warning">
          <i className="fas fa-exclamation-triangle"></i>
          <div>
            <p className="warning-title">ESP Web Tools Not Available</p>
            <p className="warning-subtitle">Use Chrome 89+ or Edge 89+ with HTTPS or localhost</p>
          </div>
        </div>
      )}

      {espSupported && (
        <div className="esp32-sidebar-inner">
          {/* Tab Navigation */}
          <Tabs
            activeKey={activeView}
            onChange={(key) => setActiveView(key as "uploader" | "repl" | "files")}
            items={[
              {
                key: "uploader",
                label: "Uploader",
                children: (
                  <div className="esp32-tools">
                

                {/* Connection Status */}
                <div className="connection-section">
                  <h4>Connection</h4>
                  <div className="connection-status">
                    <div className={`status-indicator ${isConnected ? "connected" : "disconnected"}`}>
                      <i className={`fas ${isConnected ? "fa-link" : "fa-unlink"}`}></i>
                      <span>{isConnected ? `Connected to ${selectedDevice.chipFamily}` : "Not Connected"}</span>
                    </div>

                    {connectionError && (
                      <div className="connection-error">
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{connectionError}</span>
                      </div>
                    )}

                    {autoDetecting && (
                      <div className="auto-detection-status">
                        <i className="fas fa-search fa-spin"></i>
                        <span>Auto-detecting ESP32 features...</span>
                      </div>
                    )}

                    {isConnected && replReady && !autoDetecting && (
                      <div className="auto-detection-complete">
                        <i className="fas fa-check-circle"></i>
                        <span>REPL ready!</span>
                      </div>
                    )}

                    <div className="connection-actions">
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

                {/* Upload Section */}
                <div className="upload-section">
                  <h4>Code Upload</h4>

                  {/* Progress */}
                  {isFlashing && (
                    <div className="upload-progress" style={{ marginBottom: "16px" }}>
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
                    <p className="upload-hint">
                      <i className="fas fa-info-circle"></i>
                      Write some code to enable upload
                    </p>
                  )}
                </div>

                {/* Instructions */}
                <div className="instructions-section">
                  <h4>Instructions</h4>
                  <ol className="instructions-list">
                    <li>Select your ESP32 device type from the dropdown</li>
                    <li>Click "Connect Device" to establish connection</li>
                    <li>Write or paste your Python code in the editor</li>
                    <li>Click "Upload Code"</li>
                  </ol>
                </div>
              </div>
                ),
              },
              {
                key: "repl",
                label: "REPL",
                disabled: !canShowAdvancedFeatures,
                children: (
                  <>
                    {!canShowAdvancedFeatures && (
                      <div className="esp32-feature-notice">
                        <div className="connection-info">
                          <i className="fas fa-info-circle" style={{ marginRight: "8px" }}></i>
                          <span>Connect your device first to access the REPL.</span>
                        </div>
                        <Space style={{ marginTop: "12px", width: "100%" }}>
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
                          <div className="esp32-feature-notice">
                            <div className="connection-info">
                              <i className="fas fa-info-circle"></i>
                              <span>REPL is disabled during code upload. Please wait for upload to complete.</span>
                            </div>
                          </div>
                        )}
                        
                        <ESP32REPL
                          serialPort={serialPort}
                          onError={onError}
                        />
                      </>
                    )}
                  </>
                ),
              },
              {
                key: "files",
                label: "Files",
                disabled: !isConnected,
                children: (
                  <>
                    <ESP32FileManager
                      serialPort={serialPort}
                      isConnected={isConnected}
                      onError={onError}
                    />
                  </>
                ),
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}