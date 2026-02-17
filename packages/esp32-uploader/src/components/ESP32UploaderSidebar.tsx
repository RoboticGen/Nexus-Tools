/**
 * ESP32 Uploader Sidebar Component
 * Inline version for sidebar use (no modal)
 */

"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";

import { useESP32Uploader } from "../hooks/use-esp32-uploader";
import { translateErrorMessage } from "../utils/error-messages";
import { ESP32REPL } from "./ESP32REPL";

interface ESP32UploaderSidebarProps {
  code: string;
  onStatusUpdate?: (status: string) => void;
  onError?: (error: string) => void;
}

export function ESP32UploaderSidebar({ code, onStatusUpdate, onError }: ESP32UploaderSidebarProps) {
  const [activeView, setActiveView] = useState<"uploader" | "repl">("uploader");
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
          <div className="esp32-sidebar-header">
            <div className="esp32-sidebar-tabs" role="tablist" aria-label="ESP32 tools">
              <button
                type="button"
                className={`esp32-tab-btn ${activeView === "uploader" ? "active" : ""}`}
                onClick={() => setActiveView("uploader")}
                role="tab"
                aria-selected={activeView === "uploader"}
              >
                <i className="fas fa-upload"></i>
                Uploader
              </button>
              <button
                type="button"
                className={`esp32-tab-btn ${
                  activeView === "repl" ? "active" : ""
                } ${replReady ? "ready" : ""}`}
                onClick={() => setActiveView("repl")}
                role="tab"
                aria-selected={activeView === "repl"}
                disabled={!canShowAdvancedFeatures}
              >
                <i className="fas fa-terminal"></i>
                REPL
                {replReady && (
                  <span className="tab-indicator">
                    <i className="fas fa-play"></i>
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeView === "uploader" && (
            <div className="esp32-tab-content" role="tabpanel">
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
                        <button className="btn-connect" onClick={connectToDevice} disabled={isFlashing}>
                          <i className="fas fa-plug"></i>
                          Connect Device
                        </button>
                      ) : (
                        <button className="btn-disconnect" onClick={resetConnection} disabled={isFlashing}>
                          <i className="fas fa-unlink"></i>
                          Disconnect
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Upload Section */}
                <div className="upload-section">
                  <h4>Code Upload</h4>

                  {/* Progress */}
                  {isFlashing && (
                    <div className="upload-progress">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${flashProgress}%` }}></div>
                      </div>
                      <div className="progress-text">Uploading... {flashProgress}%</div>
                    </div>
                  )}

                  <button
                    className={`btn-upload ${isFlashing ? "uploading" : ""}`}
                    onClick={handleUploadClick}
                    disabled={!code.trim() || isFlashing || !isConnected}
                  >
                    {isFlashing ? (
                      <>
                        <div className="spinner"></div>
                        Uploading... {flashProgress}%
                      </>
                    ) : (
                      <>
                        <i className="fas fa-upload"></i>
                        Upload Code
                      </>
                    )}
                  </button>

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
            </div>
          )}

          {/* REPL Tab - Always render component to maintain connection */}
          <div className={`esp32-tab-content ${activeView === "repl" ? "active" : "hidden"}`} role="tabpanel" style={{ display: activeView === "repl" ? "block" : "none" }}>
            {!canShowAdvancedFeatures && (
              <div className="esp32-feature-notice">
                <div className="connection-info">
                  <i className="fas fa-info-circle"></i>
                  <span>Connect your device first to access the REPL.</span>
                </div>

                {!isConnected ? (
                  <button className="btn-connect" onClick={connectToDevice} disabled={isFlashing}>
                    <i className="fas fa-plug"></i>
                    Connect Device
                  </button>
                ) : (
                  <button className="btn-disconnect" onClick={resetConnection} disabled={isFlashing}>
                    <i className="fas fa-unlink"></i>
                    Disconnect
                  </button>
                )}
              </div>
            )}

            {canShowAdvancedFeatures && (
              <div className="esp32-repl-wrapper">
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
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}