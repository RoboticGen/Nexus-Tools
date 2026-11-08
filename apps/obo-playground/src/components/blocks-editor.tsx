"use client";

import { OboCategory } from "@nexus-tools/blockly-python-generator";
import { BlocklyPanel } from "@nexus-tools/design-system/components/ui/blockly-panel";
import { Button } from "@nexus-tools/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@nexus-tools/design-system/components/ui/dropdown-menu";
import * as Blockly from "blockly";
import "blockly/blocks";
import { ChevronDown, Eraser, Lightbulb } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { toast } from "sonner";

import { compileWorkspace, EXAMPLE_XML, EXAMPLES, theme, toolbox } from "@/blocks/robot-blocks";
import { TRACK_PRESETS } from "@/sim/track";

const STORAGE_KEY = "obo-playground.blocks";

function loadExample(workspace: Blockly.WorkspaceSvg, xml = EXAMPLE_XML) {
  workspace.clear();
  Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xml), workspace);
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

export function BlocksEditor({
  getCodeRef,
  onExampleTrack,
}: {
  getCodeRef: RefObject<(() => string) | null>;
  /** Switches the world to the one the picked example was written for. */
  onExampleTrack: (trackKey: string) => void;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [workspace, setWorkspace] = useState<Blockly.WorkspaceSvg | null>(null);

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
        zoom: { controls: true, wheel: true, pinch: true, startScale: window.innerWidth <= 768 ? 0.7 : 0.85, maxScale: 1.5, minScale: 0.5, scaleSpeed: 1.2 },
        // wheel off so a two-finger swipe zooms, as in the 3D view; dragging the background pans.
        move: { scrollbars: { horizontal: true, vertical: true }, drag: true, wheel: false },
      });
      restore(workspace);
      workspace.addChangeListener((e: Blockly.Events.Abstract) => {
        if (e.isUiEvent || e.type === Blockly.Events.FINISHED_LOADING || workspace.isDragging()) return;
        save(workspace);
      });
      workspaceRef.current = workspace;
      setWorkspace(workspace);
      getCodeRef.current = () => compileWorkspace(workspace);
    });
    observer.observe(div);

    return () => {
      observer.disconnect();
      getCodeRef.current = null;
      workspaceRef.current?.dispose();
      workspaceRef.current = null;
      setWorkspace(null);
    };
  }, [getCodeRef]);

  const onExample = (example: (typeof EXAMPLES)[number]) => {
    if (!workspaceRef.current) return;
    loadExample(workspaceRef.current, example.xml);
    onExampleTrack(example.track);
    toast.success(`Loaded “${example.title}” on ${TRACK_PRESETS[example.track].name}. Press Run!`);
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
      workspace={workspace}
      actions={
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <Lightbulb aria-hidden="true" className="text-brand-gold" />
                Examples
                <ChevronDown aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                Each example opens in its own world
              </DropdownMenuLabel>
              {EXAMPLES.map((example) => (
                <DropdownMenuItem key={example.id} onSelect={() => onExample(example)} className="flex-col items-start gap-0.5">
                  <span className="flex w-full items-center justify-between gap-2">
                    <span className="font-medium">{example.title}</span>
                    <span className="text-muted-foreground text-xs">{TRACK_PRESETS[example.track].name}</span>
                  </span>
                  <span className="text-muted-foreground text-xs whitespace-normal">{example.summary}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="outline" onClick={onClear}>
            <Eraser aria-hidden="true" className="text-brand-coral" />
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
