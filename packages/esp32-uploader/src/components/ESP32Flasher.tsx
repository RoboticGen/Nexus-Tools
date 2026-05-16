/**
 * ESP32 Flasher Component
 * UI for firmware flashing with progress tracking and pre/post-flash operations
 */

"use client";

import { useState, useCallback, useRef, useEffect, ChangeEvent } from "react";
import { Button, Select, Checkbox, Space, Progress, Tabs } from "antd";
import {
  ThunderboltOutlined,
  StopOutlined,
  ReloadOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useESP32Flasher } from "../hooks/use-esp32-flasher";
import type { FlashStartOptions } from "../hooks/use-esp32-flasher";
import { formatDuration } from "../utils/flasher-helper";
import type { ESP32FlasherProps } from "../types/esp32";

interface FlashLog {
  timestamp: string;
  message: string;
  type: "info" | "success" | "error" | "progress";
}

const MAX_LOG_LINES = 100;

export function ESP32Flasher({
  serialPort,
  isConnected = false,
  onStatusUpdate,
  onError,
}: ESP32FlasherProps) {
  const [logs, setLogs] = useState<FlashLog[]>([]);
  const [activeTab, setActiveTab] = useState<string>("flasher");
  const [eraseFlash, setEraseFlash] = useState(true);
  const [createBackup, setCreateBackup] = useState(true);
  const [autoReset, setAutoReset] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    state,
    detectChip,

    getCompatibleFirmwares,
    selectFirmware,
    setLocalFirmware,
    clearLocalFirmware,
    startFlashing,
    cancelFlashing,
    resetDevice,
  } = useESP32Flasher(serialPort, {
    onStatusUpdate: (msg) => {
      addLog(msg, "info");
      onStatusUpdate?.(msg);
    },
    onError: (msg) => {
      addLog(msg, "error");
      onError?.(msg);
    },
    onProgressUpdate: () => {
      // Progress updates handled via state
    },
  });

  // ── Logging ────────────────────────────────────────────────────────────

  const addLog = useCallback((message: string, type: FlashLog["type"] = "info") => {
    setLogs((prev) => {
      const timestamp = new Date().toLocaleTimeString();
      const newLog: FlashLog = { timestamp, message, type };
      const updated = [...prev, newLog];
      return updated.length > MAX_LOG_LINES ? updated.slice(-MAX_LOG_LINES) : updated;
    });
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // ── Detect chip on mount/connect ───────────────────────────────────────

  const handleDetectChip = useCallback(async () => {
    if (!serialPort || !isConnected) {
      addLog("Please connect a device first", "error");
      return;
    }

    await detectChip();
  }, [serialPort, isConnected, detectChip, addLog]);

  useEffect(() => {
    // Only auto-detect once when connected, don't keep retrying if detection fails
    if (serialPort && isConnected && !state.chipInfo && state.phase !== "detecting") {
      const timer = setTimeout(() => {
        handleDetectChip();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [serialPort, isConnected]); // Removed handleDetectChip from deps to prevent infinite loop

  // ── UI State Helpers ───────────────────────────────────────────────────

  const canSelectFirmware = state.chipInfo && !state.isFlashing;
  const canFlash = state.selectedFirmware && state.chipInfo && !state.isFlashing;
  const isFlashingInProgress = state.isFlashing;

  const compatibleFirmwares = getCompatibleFirmwares();

  const handleLocalFirmwareSelect = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      try {
        const buffer = await file.arrayBuffer();
        setLocalFirmware(file.name, buffer);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        addLog(`Failed to read local firmware: ${message}`, "error");
      }
    },
    [setLocalFirmware, addLog]
  );

  const handleClearLocalFirmware = useCallback(() => {
    clearLocalFirmware();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [clearLocalFirmware]);

  return (
    <div className="flasher">
      {/* Toolbar */}


      {/* Tabbed Interface */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        style={{ flex: 1, display: "flex", flexDirection: "column" }}
        tabBarStyle={{ margin: 0, paddingLeft: "8px" }}
        items={[
          {
            key: "flasher",
            label: "Flasher",
            children: (
              <div className="flasher__content">
                {/* Not Connected */}
                {!isConnected && (
                  <div className="flasher__message">
                    <p>Connect your ESP32 device to start flashing firmware.</p>
                  </div>
                )}

                {/* Connected but no chip */}
                {isConnected && !state.chipInfo && (
                  <div className="flasher__message">
                    <p>Detecting device...</p>
                  </div>
                )}

                {/* Connected with chip detected */}
                {isConnected && state.chipInfo && (
                  <>
                    {/* Chip Info Section */}
                    <div className="flasher__section">
                      <div className="flasher__section-title">Device Information</div>
                      <div className="flasher__info-box">
                        <div className="flasher__info-row">
                          <span className="flasher__info-label">Chip Family:</span>
                          <span className="flasher__info-value">{state.chipInfo.chipFamily}</span>
                        </div>
                        <div className="flasher__info-row">
                          <span className="flasher__info-label">Chip ID:</span>
                          <span className="flasher__info-value">{state.chipInfo.chipId}</span>
                        </div>
                      </div>
                      <Button
                        size="small"
                        onClick={handleDetectChip}
                        disabled={isFlashingInProgress}
                        style={{ marginTop: "4px" }}
                      >
                        Refresh
                      </Button>
                    </div>

                    {/* Firmware Selection Section */}
                    <div className="flasher__section">
                      <div className="flasher__section-title">Firmware Selection</div>
                      <Select
                        placeholder="Select MicroPython version..."
                        disabled={!canSelectFirmware}
                        onChange={(value) => {
                          const fw = compatibleFirmwares.find((f) => f.version === value);
                          if (fw) selectFirmware(fw);
                        }}
                        style={{ width: "100%" }}
                        options={compatibleFirmwares.map((fw) => ({
                          label: `${fw.name}`,
                          value: fw.version,
                          description: fw.description,
                        }))}
                      />
                      {state.selectedFirmware && (
                        <div style={{ marginTop: "4px", fontSize: "0.8rem", color: "#666" }}>
                          Selected: <strong>{state.selectedFirmware.name}</strong>
                        </div>
                      )}
                      <div style={{ marginTop: "8px" }}>
                        <div style={{ fontSize: "0.75rem", color: "#666", marginBottom: "4px" }}>
                          Or upload a local firmware (.bin)
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".bin"
                          onChange={handleLocalFirmwareSelect}
                          disabled={isFlashingInProgress}
                        />
                        {state.customFirmwareName && (
                          <div style={{ marginTop: "6px", display: "flex", gap: "8px", alignItems: "center" }}>
                            <span style={{ fontSize: "0.8rem", color: "#666" }}>
                              Local file: <strong>{state.customFirmwareName}</strong>
                            </span>
                            <Button size="small" onClick={handleClearLocalFirmware}>
                              Clear
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pre-Flash Options */}
                    <div className="flasher__section">
                      <div className="flasher__section-title">Pre-Flash Options</div>
                      <Space direction="vertical" style={{ width: "100%" }}>
                        <Checkbox
                          checked={createBackup}
                          onChange={(e) => setCreateBackup(e.target.checked)}
                          disabled={isFlashingInProgress}
                        >
                          Create backup before flashing
                        </Checkbox>
                        <Checkbox
                          checked={eraseFlash}
                          onChange={(e) => setEraseFlash(e.target.checked)}
                          disabled={isFlashingInProgress}
                        >
                          Erase flash memory (recommended)
                        </Checkbox>
                        <Checkbox
                          checked={autoReset}
                          onChange={(e) => setAutoReset(e.target.checked)}
                          disabled={isFlashingInProgress}
                        >
                          Auto reset device after flashing
                        </Checkbox>
                      </Space>
                    </div>

                    {/* Flash Progress Section */}
                    {isFlashingInProgress && (
                      <div className="flasher__section">
                        <div className="flasher__section-title">Flashing Progress</div>
                        <Progress
                          type="circle"
                          percent={state.progress}
                          format={(percent) => `${percent}%`}
                          style={{ textAlign: "center" }}
                          width={80}
                        />
                        <div style={{ marginTop: "8px", textAlign: "center" }}>
                          <div style={{ fontSize: "0.8rem", color: "#666" }}>
                            {state.currentOperation}
                          </div>
                          {state.estimatedTimeRemaining > 0 && (
                            <div style={{ fontSize: "0.75rem", color: "#999", marginTop: "2px" }}>
                              ETA: {formatDuration(state.estimatedTimeRemaining)}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Error Display */}
                    {state.error && (
                      <div className="flasher__error">
                        <strong>⚠ Error:</strong> {state.error}
                        {state.error.includes("download") || state.error.includes("Network") ? (
                          <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", opacity: 0.9 }}>
                            <p>Troubleshooting:</p>
                            <ul style={{ marginTop: "0.25rem", paddingLeft: "1.25rem" }}>
                              <li>Check your internet connection</li>
                              <li>Try a different MicroPython version</li>
                              <li>Upload a local .bin firmware file</li>
                              <li>Visit <code>micropython.org/download</code> to get a firmware URL</li>
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* Status Messages */}
                    {state.phase === "completed" && (
                      <div className="flasher__success">
                        <strong>✓ Flash Successful!</strong>
                        <p>Your ESP32 has been updated to {state.selectedFirmware?.name}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flasher__actions">
                      {!isFlashingInProgress ? (
                        <>
                          <Button
                            type="primary"
                            danger
                            icon={<ThunderboltOutlined />}
                            onClick={() => {
                              const opts: FlashStartOptions = {
                                createBackupFirst: createBackup,
                                eraseBeforeFlash: eraseFlash,
                                autoResetAfter: autoReset,
                              };
                              startFlashing(opts);
                            }}
                            disabled={!canFlash}
                            size="large"
                          >
                            Flash Firmware
                          </Button>
                          <Button
                            icon={<ReloadOutlined />}
                            onClick={() => resetDevice()}
                            disabled={!isConnected}
                          >
                            Reset Device
                          </Button>
                        </>
                      ) : (
                        <Button
                          danger
                          icon={<StopOutlined />}
                          onClick={() => cancelFlashing()}
                          size="large"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ),
          },
          {
            key: "log",
            label: `Log (${logs.length})`,
            children: (
              <div className="flasher__log-tab-content">
                <div className="flasher__log-header">
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      setLogs([]);
                      addLog("Log cleared");
                    }}
                  >
                    Clear Log
                  </Button>
                </div>
                <div className="flasher__log">
                  {logs.length === 0 ? (
                    <div className="flasher__log-empty">No operations yet</div>
                  ) : (
                    logs.map((log, i) => (
                      <div
                        key={i}
                        className={`flasher__log-line flasher__log-line--${log.type}`}
                      >
                        <span className="flasher__log-time">{log.timestamp}</span>
                        <span className="flasher__log-message">{log.message}</span>
                      </div>
                    ))
                  )}
                  <div ref={scrollRef} />
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
