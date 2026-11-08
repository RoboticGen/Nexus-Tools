"use client";

import { OboCategory } from "@nexus-tools/blockly-python-generator";
import { BlocklyPanel } from "@nexus-tools/design-system/components/ui/blockly-panel";
import { Button } from "@nexus-tools/design-system/components/ui/button";
import * as Blockly from "blockly";
import "blockly/blocks";
import { Eraser, Lightbulb } from "lucide-react";
import { useEffect, useRef, type RefObject } from "react";
import { toast } from "sonner";

import { compileWorkspace, EXAMPLE_XML, theme, toolbox } from "@/blocks/robot-blocks";

const STORAGE_KEY = "obo-playground.blocks";

function loadExample(workspace: Blockly.WorkspaceSvg) {
  workspace.clear();
  Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(EXAMPLE_XML), workspace);
}

// Storage can throw (blocked site data, sandboxed iframes); the workspace must still work.
function restore(workspace: Blockly.WorkspaceSvg) {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      Blockly.serialization.workspaces.load(JSON.parse(saved), workspace);
      return;
    }
  } catch {
    // fall through to the example
  }
  loadExample(workspace);
}

function save(workspace: Blockly.WorkspaceSvg) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Blockly.serialization.workspaces.save(workspace)));
  } catch {
    // not saved this time; nothing else depends on it
  }
}

export function BlocksEditor({ getCodeRef }: { getCodeRef: RefObject<(() => string) | null> }) {
  const divRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);

  useEffect(() => {
    const div = divRef.current;
    if (!div) return;
    Blockly.registry.register(
      Blockly.registry.Type.TOOLBOX_ITEM,
      Blockly.ToolboxCategory.registrationName,
      OboCategory,
      true,
    );

    // Inject only once the container has a real size: Next's dynamic import and flex
    // percentages can take several layout passes. Later sizes come from splitter drags,
    // which never fire window.resize, so Blockly has to be told.
    const observer = new ResizeObserver(([entry]) => {
      if (!entry || entry.contentRect.width <= 0 || entry.contentRect.height <= 0) return;
      if (workspaceRef.current) {
        Blockly.svgResize(workspaceRef.current);
        return;
      }
      const workspace = Blockly.inject(div, {
        toolbox,
        theme,
        renderer: "zelos",
        trashcan: true,
        grid: { spacing: 20, length: 1, colour: "#888", snap: false },
        zoom: { controls: true, startScale: window.innerWidth <= 768 ? 0.7 : 0.85, maxScale: 1.5, minScale: 0.5, scaleSpeed: 1.2 },
        move: { scrollbars: { horizontal: true, vertical: true }, drag: true, wheel: true },
      });
      restore(workspace);
      workspace.addChangeListener((e: Blockly.Events.Abstract) => {
        if (e.isUiEvent || e.type === Blockly.Events.FINISHED_LOADING || workspace.isDragging()) return;
        save(workspace);
      });
      workspaceRef.current = workspace;
      getCodeRef.current = () => compileWorkspace(workspace);
    });
    observer.observe(div);

    return () => {
      observer.disconnect();
      getCodeRef.current = null;
      workspaceRef.current?.dispose();
      workspaceRef.current = null;
    };
  }, [getCodeRef]);

  const onExample = () => {
    if (!workspaceRef.current) return;
    loadExample(workspaceRef.current);
    toast.info("Loaded the wall-following example.");
  };

  const onClear = () => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    Blockly.dialog.confirm("Remove all blocks?", (ok) => {
      if (ok) workspace.clear();
    });
  };

  return (
    <BlocklyPanel
      title="Blocks"
      className="h-full"
      actions={
        <>
          <Button size="sm" variant="outline" onClick={onExample}>
            <Lightbulb aria-hidden="true" />
            Example
          </Button>
          <Button size="sm" variant="outline" onClick={onClear}>
            <Eraser aria-hidden="true" />
            Clear
          </Button>
        </>
      }
    >
      {/* Blockly measures this element; min-h-0 lets the flex parent shrink it below its content. */}
      <div ref={divRef} className="h-full min-h-0 w-full overflow-hidden" />
    </BlocklyPanel>
  );
}
