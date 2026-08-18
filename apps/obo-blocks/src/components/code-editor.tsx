"use client";

import { Copy, Download, Pencil, Play, Save, Zap } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, forwardRef, useImperativeHandle } from "react";

import { Button } from "@/components/ui/button";
import { CodeEditorPanel } from "@/components/ui/code-editor-panel";
import { ToolbarSeparator } from "@/components/ui/toolbar";
import { useTheme } from "@/hooks/use-theme";

const MonacoCodeEditorComponent = dynamic(
  () => import("@nexus-tools/monaco-editor").then((mod) => ({ default: mod.MonacoCodeEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="text-muted-foreground flex h-full items-center justify-center">
        Loading editor...
      </div>
    ),
  }
);

interface CodeTab {
  id: string;
  name: string;
  code: string;
}

interface CodeEditorProps {
  code: string;
  /** Whether the buffer is editable. Blocks own the code until the user opts in. */
  isEditing?: boolean;
  onChange: (code: string) => void;
  onEditToggle?: (editing: boolean) => void;
  /** Fires when the active file changes, so the device sidebar can highlight it. */
  onActiveTabChange?: (filename: string) => void;
  onRun: () => void;
  onRunInESP32?: () => void;
  onCopy: () => void;
  onExport: () => void;
  onSaveToDevice?: (filename: string, content: string) => void;
  isConnected?: boolean;
  className?: string;
}

export interface CodeEditorHandle {
  openFileInTab: (filename: string, content: string) => void;
}

/**
 * obo-blocks' Python panel, built on the design system's `CodeEditorPanel`.
 *
 * Replaces `SharedCodePanel` from `@nexus-tools/ui`, whose toolbar was antd
 * `Button`s with `@ant-design/icons` and whose tab strip was hand-rolled
 * `.code-tab` markup. It expressed its toolbar as six `show*Button` booleans;
 * here the buttons are just children of `actions`, so obo-blocks and obo-code
 * can pass different sets without the panel knowing about either.
 *
 * The one obo-blocks-specific behaviour is the read-only buffer: the code is
 * generated from blocks, so editing it by hand is opt-in via the Edit toggle.
 * `CodeEditorPanel` takes that as a `readOnly` prop and renders the badge.
 */
export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  (
    {
      code,
      isEditing = false,
      onChange,
      onEditToggle,
      onActiveTabChange,
      onRun,
      onRunInESP32,
      onCopy,
      onExport,
      onSaveToDevice,
      isConnected = false,
      className,
    },
    ref
  ) => {
    const [tabs, setTabs] = useState<CodeTab[]>([{ id: "main", name: "main.py", code: code || "" }]);
    const [activeTabId, setActiveTabId] = useState("main");
    // Monaco ships its own themes and can't read our CSS tokens, so it has to
    // be told which one to use — otherwise the editor stays white inside an
    // otherwise-dark workspace.
    const { resolvedTheme } = useTheme();

    const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];

    // Blockly regenerates `code` on every workspace change, so the generated
    // buffer has to follow it. Only while not editing: once the user takes the
    // buffer over, overwriting their edits on the next block nudge would lose
    // their work. Named tabs opened from the device are never overwritten.
    useEffect(() => {
      if (isEditing) return;
      setTabs((prevTabs) =>
        prevTabs.map((tab) => (tab.id === "main" ? { ...tab, code } : tab))
      );
    }, [code, isEditing]);

    const handleChange = useCallback(
      (value: string) => {
        setTabs((prevTabs) => prevTabs.map((tab) => (tab.id === activeTabId ? { ...tab, code: value } : tab)));
        onChange(value);
      },
      [activeTabId, onChange]
    );

    const handleAddTab = useCallback(() => {
      const newTabId = `tab-${Date.now()}`;
      const newTabName = `untitled-${tabs.length}.py`;
      setTabs((prevTabs) => [...prevTabs, { id: newTabId, name: newTabName, code: "" }]);
      setActiveTabId(newTabId);
      onActiveTabChange?.(newTabName);
    }, [tabs.length, onActiveTabChange]);

    const openFileInTab = useCallback(
      (filename: string, content: string) => {
        const newTabId = `file-${Date.now()}`;
        setTabs((prevTabs) => [...prevTabs, { id: newTabId, name: filename, code: content }]);
        setActiveTabId(newTabId);
        onActiveTabChange?.(filename);
        onChange(content);
      },
      [onChange, onActiveTabChange]
    );

    useImperativeHandle(ref, () => ({ openFileInTab }), [openFileInTab]);

    const handleCloseTab = useCallback(
      (tabId: string) => {
        if (tabs.length === 1) return;

        const newTabs = tabs.filter((tab) => tab.id !== tabId);
        setTabs(newTabs);

        if (activeTabId === tabId) {
          const nextTab = newTabs[0];
          setActiveTabId(nextTab.id);
          onActiveTabChange?.(nextTab.name);
          onChange(nextTab.code);
        }
      },
      [tabs, activeTabId, onChange, onActiveTabChange]
    );

    const handleSwitchTab = useCallback(
      (tabId: string) => {
        const tabToSwitch = tabs.find((tab) => tab.id === tabId);
        if (tabToSwitch) {
          setActiveTabId(tabId);
          onActiveTabChange?.(tabToSwitch.name);
          onChange(tabToSwitch.code);
        }
      },
      [tabs, onChange, onActiveTabChange]
    );

    const handleRenameTab = useCallback((tabId: string, label: string) => {
      setTabs((prevTabs) => prevTabs.map((tab) => (tab.id === tabId ? { ...tab, name: label } : tab)));
    }, []);

    const handleSaveToDevice = useCallback(() => {
      if (!activeTab.code.trim()) return;
      onSaveToDevice?.(activeTab.name, activeTab.code);
    }, [activeTab, onSaveToDevice]);

    return (
      <CodeEditorPanel
        title="Python Code"
        toolbarLabel="Editor actions"
        className={className}
        readOnly={!isEditing}
        tabs={tabs.map((tab) => ({ id: tab.id, label: tab.name }))}
        activeTab={activeTabId}
        onTabChange={handleSwitchTab}
        onTabClose={handleCloseTab}
        onTabRename={handleRenameTab}
        onTabAdd={handleAddTab}
        actions={
          <>
            {/*
              A toggle, not two buttons: `aria-pressed` announces the state, so
              a screen reader isn't left inferring it from which label shows.
            */}
            <Button
              size="sm"
              variant={isEditing ? "default" : "outline"}
              aria-pressed={isEditing}
              onClick={() => onEditToggle?.(!isEditing)}
              title={isEditing ? "Stop editing the generated code" : "Edit the generated code by hand"}
            >
              <Pencil aria-hidden="true" />
              {isEditing ? "Editing" : "Edit"}
            </Button>
            <Button size="sm" onClick={onRun} title="Run Python Code">
              <Play aria-hidden="true" />
              Run
            </Button>
            {onRunInESP32 && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRunInESP32}
                disabled={!isConnected}
                title={isConnected ? "Restart ESP32 to run main.py" : "Connect device first"}
              >
                <Zap aria-hidden="true" />
                Run in ESP32
              </Button>
            )}
            <ToolbarSeparator />
            <Button size="sm" variant="outline" onClick={onCopy} title="Copy Code to Clipboard">
              <Copy aria-hidden="true" />
              Copy
            </Button>
            <Button size="sm" variant="outline" onClick={onExport} title="Export Code">
              <Download aria-hidden="true" />
              Export
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveToDevice}
              disabled={!isConnected}
              title={isConnected ? "Save to ESP32 Device" : "Connect device first"}
            >
              <Save aria-hidden="true" />
              Save Device
            </Button>
          </>
        }
      >
        <MonacoCodeEditorComponent
          code={activeTab.code}
          onChange={handleChange}
          language="python"
          theme={resolvedTheme === "dark" ? "vs-dark" : "vs-light"}
          height="100%"
          showMinimap={false}
          readOnly={!isEditing}
        />
      </CodeEditorPanel>
    );
  }
);

CodeEditor.displayName = "CodeEditor";
