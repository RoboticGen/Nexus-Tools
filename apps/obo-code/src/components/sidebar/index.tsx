/**
 * Main Sidebar Component
 * Collapsible sidebar that can contain multiple tool panels
 */

"use client";

import { ESP32UploaderSidebar } from "@nexus-tools/esp32-uploader";
import { useState, useEffect } from "react";

interface SidebarProps {
  code: string;
  onStatusUpdate?: (status: string) => void;
  onError?: (error: string) => void;
  onExpandedChange?: (expanded: boolean) => void;
}

interface ToolPanel {
  id: string;
  title: string;
  icon: string;
  component: React.ReactNode;
}

export function Sidebar({ code, onStatusUpdate, onError, onExpandedChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>("esp32");

  // Notify parent of initial expanded state
  useEffect(() => {
    onExpandedChange?.(true);
  }, [onExpandedChange]);

  const toolPanels: ToolPanel[] = [
    {
      id: "esp32",
      title: "ESP32 Uploader",
      icon: "fa-microchip",
      component: (
        <ESP32UploaderPanel
          code={code}
          onStatusUpdate={onStatusUpdate}
          onError={onError}
        />
      ),
    },
    // Add more tools here in the future
    // {
    //   id: "serialmonitor", 
    //   title: "Serial Monitor",
    //   icon: "fa-terminal",
    //   component: <SerialMonitorPanel />,
    // },
  ];

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    if (newState) {
      setActivePanel(null);
    } else {
      // When expanding, always show ESP32 uploader
      setActivePanel("esp32");
    }
    // Notify parent of expanded state (opposite of collapsed)
    onExpandedChange?.(!newState);
  };

  return (
    <div className={`sidebar ${isCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}>
      {/* Sidebar Toggle Button */}
      <button
        className="sidebar-toggle"
        onClick={toggleSidebar}
        title={isCollapsed ? "Expand toolbar" : "Collapse toolbar"}
      >
        <span className="tool-icon">
          <i className={`fas ${isCollapsed ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ 
            fontFamily: '"Font Awesome 6 Free", sans-serif',
            fontWeight: 900 
          }}></i>
          <span className="icon-fallback">{isCollapsed ? '▲' : '▼'}</span>
        </span>
      </button>

      {/* Active Panel Content - Always show when not collapsed */}
      {!isCollapsed && activePanel && (
        <div className="sidebar-content">
          <div className="panel-body">
            {toolPanels.find(p => p.id === activePanel)?.component}
          </div>
        </div>
      )}
    </div>
  );
}

// ESP32 Uploader Panel Component
function ESP32UploaderPanel({ code, onStatusUpdate, onError }: {
  code: string;
  onStatusUpdate?: (status: string) => void;
  onError?: (error: string) => void;
}) {
  return (
    <ESP32UploaderSidebar
      code={code}
      onStatusUpdate={onStatusUpdate}
      onError={onError}
    />
  );
}