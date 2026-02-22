"use client";

import { CloseOutlined, PlusOutlined } from "@ant-design/icons";
import dynamic from "next/dynamic";
import { useCallback, useState, forwardRef, useImperativeHandle, useEffect, useRef } from "react";

import { Button } from "./button";

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

interface SharedCodeEditorProps {
  /** Initial code content */
  code: string;
  /** Callback when code changes */
  onChange: (code: string) => void;
  /** Whether editor is read-only */
  readOnly?: boolean;
  /** Monaco editor language (default: 'python') */
  language?: string;
  /** Monaco editor theme (default: 'vs-dark') */
  theme?: string;
  /** Whether to show minimap (default: false) */
  showMinimap?: boolean;
}

export interface SharedCodeEditorHandle {
  openFileInTab: (filename: string, content: string) => void;
  getActiveTabName: () => string;
}

/**
 * Shared Code Editor with multi-tab support.
 * Used in both obo-code and obo-blocks applications.
 */
export const SharedCodeEditor = forwardRef<SharedCodeEditorHandle, SharedCodeEditorProps>(
  (
    {
      code,
      onChange,
      readOnly = false,
      language = "python",
      theme = "vs-light",
      showMinimap = false,
    },
    ref
  ) => {
    const [tabs, setTabs] = useState<CodeTab[]>([
      { id: "main", name: "main.py", code: code || "" },
    ]);
    const [activeTabId, setActiveTabId] = useState("main");
    const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const isInternalUpdate = useRef(false);

    const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];

    // Sync external code changes with the main tab (only when not from internal updates)
    useEffect(() => {
      if (!isInternalUpdate.current) {
        setTabs((prevTabs) =>
          prevTabs.map((tab) =>
            tab.id === "main" ? { ...tab, code: code } : tab
          )
        );
      }
      isInternalUpdate.current = false;
    }, [code]);

    // Update code in active tab
    const handleChange = useCallback(
      (value: string) => {
        setTabs((prevTabs) =>
          prevTabs.map((tab) =>
            tab.id === activeTabId ? { ...tab, code: value } : tab
          )
        );
        isInternalUpdate.current = true;
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
      isInternalUpdate.current = true;
      onChange(""); // Sync empty code to parent
    }, [tabs.length, onChange]);

    // Open file in new tab
    const openFileInTab = useCallback((filename: string, content: string) => {
      const newTabId = `file-${Date.now()}`;
      setTabs((prevTabs) => [
        ...prevTabs,
        { id: newTabId, name: filename, code: content },
      ]);
      setActiveTabId(newTabId);
      isInternalUpdate.current = true;
      onChange(content);
    }, [onChange]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      openFileInTab,
      getActiveTabName: () => activeTab.name,
    }), [openFileInTab, activeTab.name]);

    // Close tab
    const handleCloseTab = useCallback(
      (tabId: string) => {
        if (tabs.length === 1) return; // Keep at least one tab
        
        const newTabs = tabs.filter((tab) => tab.id !== tabId);
        setTabs(newTabs);
        
        // Switch to another tab if closing active tab
        if (activeTabId === tabId) {
          const nextTab = newTabs[0];
          setActiveTabId(nextTab.id);
          isInternalUpdate.current = true;
          onChange(nextTab.code);
        }
    },
    [tabs, activeTabId, onChange]
  );

  // Switch to tab
  const handleSwitchTab = useCallback((tabId: string) => {
    const tabToSwitch = tabs.find((tab) => tab.id === tabId);
    if (tabToSwitch) {
      setActiveTabId(tabId);
      isInternalUpdate.current = true;
      onChange(tabToSwitch.code);
    }
  }, [tabs, onChange]);

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

  return (
    <div className="code-editor-container">
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
              {tabs.length > 1 && (
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
              )}
            </div>
          ))}
          <Button
            variant="default"
            icon={<PlusOutlined />}
            onClick={handleAddTab}
            title="Add new tab"
            style={{ 
              color: '#ffffff', 
              background: 'transparent',
              border: 'none',
              height: '24px',
              width: '24px',
              minWidth: '24px',
              padding: '0',
              fontSize: '0.85rem',
              marginTop: '10px',
              marginLeft: '4px',
              flexShrink: 0,
            }}
          />
        </div>
      </div>

      <div className="code-editor-wrapper">
        <MonacoCodeEditorComponent
          code={activeTab.code}
          onChange={handleChange}
          readOnly={readOnly}
          language={language as "python" | "javascript" | "typescript" | "json" | undefined}
          theme={theme as "vs-dark" | "vs-light" | undefined}
          height="100%"
          showMinimap={showMinimap}
        />
      </div>
    </div>
  );
}
);

SharedCodeEditor.displayName = "SharedCodeEditor";
