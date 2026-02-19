"use client";

import { CopyOutlined, ExportOutlined, PlayCircleOutlined, PlusOutlined, CloseOutlined, SaveOutlined } from "@ant-design/icons";
import { OBO_CODE_CONFIG } from "@nexus-tools/monaco-editor";
import { Button } from "@nexus-tools/ui";
import dynamic from "next/dynamic";
import { useCallback, useState, forwardRef, useImperativeHandle } from "react";

const MonacoCodeEditorComponent = dynamic(
  () => import("@nexus-tools/monaco-editor").then((mod) => ({ default: mod.MonacoCodeEditor })),
  {
    ssr: false,
    loading: () => <div className="code-editor-loading">Loading editor...</div>,
  }
);

interface CodeTab {
  id: string;
  name: string;
  code: string;
}

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  onRun: () => void;
  onCopy: () => void;
  onExport: () => void;
  onSaveToDevice?: (filename: string, content: string) => void;
}

export interface CodeEditorHandle {
  openFileInTab: (filename: string, content: string) => void;
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  (
    {
      code,
      onChange,
      onRun,
      onCopy,
      onExport,
      onSaveToDevice,
    },
    ref
  ) => {
    const [tabs, setTabs] = useState<CodeTab[]>([
      { id: "main", name: "main.py", code: code || "" },
    ]);
    const [activeTabId, setActiveTabId] = useState("main");
    const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState("");

    const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];

    // Update code in active tab
    const handleChange = useCallback(
      (value: string) => {
        setTabs((prevTabs) =>
          prevTabs.map((tab) =>
            tab.id === activeTabId ? { ...tab, code: value } : tab
          )
        );
        onChange(value);
      },
      [activeTabId, onChange]
    );

    // Add new tab
    const handleAddTab = useCallback(() => {
      const newTabId = `tab-${Date.now()}`;
      const newTabName = `untitled-${tabs.length}.py`;
      setTabs((prevTabs) => [
        ...prevTabs,
        { id: newTabId, name: newTabName, code: "" },
      ]);
      setActiveTabId(newTabId);
    }, [tabs.length]);

    // Open file in new tab
    const openFileInTab = useCallback((filename: string, content: string) => {
      const newTabId = `file-${Date.now()}`;
      setTabs((prevTabs) => [
        ...prevTabs,
        { id: newTabId, name: filename, code: content },
      ]);
      setActiveTabId(newTabId);
    }, []);

    // Expose openFileInTab method via ref
    useImperativeHandle(ref, () => ({
      openFileInTab,
    }), [openFileInTab]);

    // Close tab
    const handleCloseTab = useCallback(
      (tabId: string) => {
        if (tabs.length === 1) return; // Keep at least one tab
        
        const newTabs = tabs.filter((tab) => tab.id !== tabId);
        setTabs(newTabs);
        
        // Switch to another tab if closing active tab
        if (activeTabId === tabId) {
          setActiveTabId(newTabs[0].id);
        }
    },
    [tabs, activeTabId]
  );

  // Switch to tab
  const handleSwitchTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  // Start renaming a tab
  const handleStartRename = (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (tab) {
      setRenamingTabId(tabId);
      setRenameValue(tab.name);
    }
  };

  // Handle rename input change
  const handleRenameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRenameValue(e.target.value);
  };

  // Complete rename
  const handleRenameTab = useCallback(() => {
    if (renamingTabId && renameValue.trim()) {
      setTabs((prevTabs) =>
        prevTabs.map((tab) =>
          tab.id === renamingTabId ? { ...tab, name: renameValue.trim() } : tab
        )
      );
    }
    setRenamingTabId(null);
    setRenameValue("");
  }, [renamingTabId, renameValue]);

  // Handle rename input key events
  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleRenameTab();
    } else if (e.key === "Escape") {
      setRenamingTabId(null);
      setRenameValue("");
    }
  };

  // Handle save to device
  const handleSaveToDevice = useCallback(() => {
    if (!activeTab.code.trim()) {
      return;
    }
    onSaveToDevice?.(activeTab.name, activeTab.code);
  }, [activeTab, onSaveToDevice]);

  return (
    <div className="code-panel">
      <div className="panel-header">
        <span className="panel-title">Python Code</span>
        <div className="button-group" style={{ display: "flex", gap: "8px" }}>
          <Button
            variant="default"
            icon={<PlayCircleOutlined />}
            onClick={onRun}
            title="Run Python Code (Ctrl+Enter)"
          >
            Run
          </Button>
          <Button
            icon={<CopyOutlined />}
            onClick={onCopy}
            title="Copy Code to Clipboard"
          >
            Copy
          </Button>
          <Button
            icon={<ExportOutlined />}
            onClick={onExport}
            title="Export Code"
          >
            Export
          </Button>
          <Button
            icon={<SaveOutlined />}
            onClick={handleSaveToDevice}
            title="Save to ESP32 Device"
          >
            Save Device
          </Button>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="code-tabs-header">
        <div className="code-tabs-list">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`code-tab ${activeTabId === tab.id ? "active" : ""}`}
              onClick={() => handleSwitchTab(tab.id)}
            >
              {renamingTabId === tab.id ? (
                <input
                  type="text"
                  className="tab-rename-input"
                  value={renameValue}
                  onChange={handleRenameChange}
                  onKeyDown={handleRenameKeyDown}
                  onBlur={handleRenameTab}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className="tab-name"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleStartRename(tab.id);
                  }}
                >
                  {tab.name}
                </span>
              )}
              <button
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseTab(tab.id);
                }}
                title="Close tab"
              >
                <CloseOutlined />
              </button>
            </div>
          ))}
        </div>
        <Button
          variant="default"
          icon={<PlusOutlined />}
          onClick={handleAddTab}
          title="Add new tab"
          className="tab-add-btn"
        />
      </div>

      <div className="code-editor-wrapper">
        <MonacoCodeEditorComponent
          code={activeTab.code}
          onChange={handleChange}
          language={OBO_CODE_CONFIG.language}
          theme={OBO_CODE_CONFIG.theme}
          height="100%"
          showMinimap={OBO_CODE_CONFIG.showMinimap}
        />
      </div>
    </div>
  );
}
);
