"use client";

import { CloseOutlined, PlusOutlined } from "@ant-design/icons";
import { OBO_BLOCKS_CONFIG } from "@nexus-tools/monaco-editor";
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
  readOnly?: boolean;
}

export interface CodeEditorHandle {
  openFileInTab: (filename: string, content: string) => void;
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  (
    {
      code,
      onChange,
      readOnly = false,
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
      onChange(content);
    }, [onChange]);

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
          const nextTab = newTabs[0];
          setActiveTabId(nextTab.id);
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
                    if (!readOnly) {
                      handleStartRename(tab.id);
                    }
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
          language={OBO_BLOCKS_CONFIG.language}
          theme={OBO_BLOCKS_CONFIG.theme}
          height="100%"
          showMinimap={OBO_BLOCKS_CONFIG.showMinimap}
        />
      </div>
    </div>
  );
}
);

CodeEditor.displayName = "CodeEditor";
