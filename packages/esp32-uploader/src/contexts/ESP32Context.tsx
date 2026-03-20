/**
 * ESP32Context - Centralized state management for ESP32 connection
 * Eliminates props drilling and provides single source of truth
 */

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

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
  clearNotification: () => void;
  
  // Current notification
  notification: {
    type: "error" | "success" | "status" | null;
    message: string;
  };
}

const ESP32Context = createContext<ESP32ContextValue | undefined>(undefined);

export function ESP32Provider({ children }: { children: ReactNode }) {
  const [serialPort, setSerialPort] = useState<any | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notification, setNotification] = useState<{
    type: "error" | "success" | "status" | null;
    message: string;
  }>({ type: null, message: "" });

  const showError = useCallback((message: string) => {
    setNotification({ type: "error", message });
  }, []);

  const showSuccess = useCallback((message: string) => {
    setNotification({ type: "success", message });
  }, []);

  const showStatus = useCallback((message: string) => {
    setNotification({ type: "status", message });
  }, []);

  const clearNotification = useCallback(() => {
    setNotification({ type: null, message: "" });
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
        clearNotification,
        notification,
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
