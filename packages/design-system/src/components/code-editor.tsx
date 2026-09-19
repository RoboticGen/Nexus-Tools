"use client";

import { Copy, Download, Pencil, Play, Save, Zap } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, forwardRef, useImperativeHandle } from "react";

import { Button } from "@nexus-tools/design-system/components/ui/button";
import { CodeEditorPanel } from "@nexus-tools/design-system/components/ui/code-editor-panel";
import { ToolbarSeparator } from "@nexus-tools/design-system/components/ui/toolbar";
import { useTheme } from "@nexus-tools/design-system/hooks/use-theme";

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
  /**
   * True for a tab opened from the device file list. The scratch tab the editor starts with is
   * named after `defaultFileName` — "main.py" by default, which is also the commonest filename on
   * an ESP32 — so matching an incoming file by name alone would focus the scratch buffer and show
   * the wrong contents. Only device-opened tabs are candidates for reuse.
   */
  fromDevice?: boolean;
}

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  /** Omit for an always-editable buffer; pass a boolean for a generated one, which adds the Edit toggle and follows `code` until the user takes over. */
  isEditing?: boolean;
  onEditToggle?: (editing: boolean) => void;
  /** Fires when the active file changes, so a device sidebar can highlight it. */
  onActiveTabChange?: (filename: string) => void;
  onRun: () => void;
  onRunInESP32?: () => void;
  onCopy: () => void;
  onExport: () => void;
  onSaveToDevice?: (filename: string, content: string) => void;
  isConnected?: boolean;
  /** Name of the tab the editor opens with. */
  defaultFileName?: string;
  className?: string;
}

export interface CodeEditorHandle {
  openFileInTab: (filename: string, content: string) => void;
}

/** The Python editor panel shared by obo-code and obo-blocks; they differ only in the read-only buffer, which is the `isEditing` prop. */
export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  function CodeEditor(
    {
      code,
      onChange,
      isEditing,
      onEditToggle,
      onActiveTabChange,
      onRun,
      onRunInESP32,
      onCopy,
      onExport,
      onSaveToDevice,
      isConnected = false,
      defaultFileName = "main.py",
      className,
    },
    ref
  ) {
    const isGenerated = isEditing !== undefined;
    const editable = isEditing ?? true;

    const [tabs, setTabs] = useState<CodeTab[]>([
      { id: "main", name: defaultFileName, code: code || "" },
    ]);
    const [activeTabId, setActiveTabId] = useState("main");
    // Monaco ships its own themes and cannot read our CSS tokens, so it must be told which to use.
    const { resolvedTheme } = useTheme();

    const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];

    // A generated buffer follows `code`, but only while not editing — otherwise the next block change overwrites what the user typed.
    useEffect(() => {
      if (!isGenerated || editable) return;
      setTabs((prevTabs) =>
        prevTabs.map((tab) => (tab.id === "main" ? { ...tab, code } : tab))
      );
    }, [code, isGenerated, editable]);

    const handleChange = useCallback(
      (value: string) => {
        // Monaco's read-only path calls `setValue()` without setting its own
        // preventTriggerChangeEvent flag (the editable path does), so every programmatic update
        // echoes back here as though it had been typed. The user cannot type while read-only, so a
        // change event in that state is always that echo.
        //
        // Comparing `value` against the active tab is not enough: this callback closes over the
        // render before the switch, so the echo arrives while `activeTabId` still names the tab we
        // just left, and the new file's text gets written into it — then forwarded to the parent,
        // where obo-blocks' generated-code effect copies it onto the Blockly tab as well. That is
        // how every tab ended up holding the last-opened file.
        if (!editable) return;

        setTabs((prevTabs) =>
          prevTabs.map((tab) => (tab.id === activeTabId ? { ...tab, code: value } : tab))
        );
        onChange(value);
      },
      [editable, activeTabId, onChange]
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
        // Re-opening a file that is already in a tab focuses that tab rather than
        // appending a second one. Without this, each click in the file sidebar added
        // another tab with the same name, and every copy carried its own `code` — so
        // edits made in one silently diverged from the device content loaded into the
        // next, and whichever tab was saved last won.
        const existing = tabs.find((tab) => tab.fromDevice && tab.name === filename);
        if (existing) {
          setActiveTabId(existing.id);
          onActiveTabChange?.(filename);
          // The tab's own buffer, not the freshly-read `content`: focusing a tab must
          // not discard unsaved edits sitting in it.
          if (!isGenerated) onChange(existing.code);
          return;
        }

        const newTabId = `file-${Date.now()}`;
        setTabs((prevTabs) => [
          ...prevTabs,
          { id: newTabId, name: filename, code: content, fromDevice: true },
        ]);
        setActiveTabId(newTabId);
        onActiveTabChange?.(filename);
        // In generated mode the parent's `code` is the Blockly program, not "whatever buffer is
        // on screen". Reporting a device file through it makes the generated-code effect copy that
        // file over the `main` tab, after which both tabs hold the same text and switching between
        // them appears to do nothing.
        if (!isGenerated) onChange(content);
      },
      [tabs, isGenerated, onChange, onActiveTabChange]
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
          if (!isGenerated) onChange(tabToSwitch.code);
        }
      },
      [tabs, isGenerated, onChange, onActiveTabChange]
    );

    const handleRenameTab = useCallback((tabId: string, label: string) => {
      setTabs((prevTabs) =>
        prevTabs.map((tab) => (tab.id === tabId ? { ...tab, name: label } : tab))
      );
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
        readOnly={!editable}
        tabs={tabs.map((tab) => ({ id: tab.id, label: tab.name }))}
        activeTab={activeTabId}
        onTabChange={handleSwitchTab}
        onTabClose={handleCloseTab}
        onTabRename={handleRenameTab}
        onTabAdd={handleAddTab}
        actions={
          <>
            {isGenerated && (
              // A toggle, not two buttons: `aria-pressed` announces the state rather than leaving it inferred from the label.
              <Button
                size="sm"
                variant={editable ? "default" : "outline"}
                aria-pressed={editable}
                onClick={() => onEditToggle?.(!editable)}
                title={editable ? "Stop editing the generated code" : "Edit the generated code by hand"}
              >
                <Pencil aria-hidden="true" />
                {editable ? "Editing" : "Edit"}
              </Button>
            )}
            <Button size="sm" variant="default" onClick={onRun} title="Run Python Code (Ctrl+Enter)">
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
          readOnly={!editable}
        />
      </CodeEditorPanel>
    );
  }
);
