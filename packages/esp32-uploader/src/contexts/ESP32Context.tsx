/**
 * ESP32Context - Centralized state management for ESP32 connection
 * Eliminates props drilling and provides single source of truth
 */

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { notification } from "antd";

interface ESP32ContextValue {
  // Connection state
  serialPort: any | null;
  isConnected: boolean;

  // Actions
  setSerialPort: (port: any | null) => void;
  setIsConnected: (connected: boolean) => void;

  // Notifications
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
  showStatus: (message: string) => void;
}

const ESP32Context = createContext<ESP32ContextValue | undefined>(undefined);

export function ESP32Provider({ children }: { children: ReactNode }) {
  const [serialPort, setSerialPort] = useState<any | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const showError = useCallback((message: string) => {
    notification.error({
      message: "Error",
      description: message,
      duration: 2,
      placement: "topRight",
    });
  }, []);

  const showSuccess = useCallback((message: string) => {
    notification.success({
      message: "Success",
      description: message,
      duration: 2,
      placement: "topRight",
    });
  }, []);

  const showStatus = useCallback((message: string) => {
    notification.info({
      message: "Status",
      description: message,
      duration: 2,
      placement: "topRight",
    });
  }, []);

  return (
    <ESP32Context.Provider
      value={{
        serialPort,
        isConnected,
        setSerialPort,
        setIsConnected,
        showError,
        showSuccess,
        showStatus,
      }}
    >
      {children}
    </ESP32Context.Provider>
  );
}

export function useESP32Context() {
  const context = useContext(ESP32Context);
  if (!context) {
    throw new Error("useESP32Context must be used within ESP32Provider");
  }
  return context;
}
