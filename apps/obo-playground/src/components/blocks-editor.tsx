"use client";

import { OboCategory } from "@nexus-tools/blockly-python-generator";
import { BlocklyPanel } from "@nexus-tools/design-system/components/ui/blockly-panel";
import { Button } from "@nexus-tools/design-system/components/ui/button";
import * as Blockly from "blockly";
import "blockly/blocks";
import { Download, Eraser, Upload } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from "react";
import { toast } from "sonner";

import { EXAMPLE_XML } from "@/blocks/examples";
import { projectFile, readProjectFile } from "@/blocks/project-file";
import { compileWorkspace, theme, toolbox } from "@/blocks/robot-blocks";
import type { Track } from "@/sim/track";

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
  loadBlocksRef,
  world,
  onImportWorld,
}: {
  getCodeRef: RefObject<(() => string) | null>;
  /** Set once the workspace exists; replaces its blocks with the given XML. */
  loadBlocksRef: RefObject<((xml: string) => void) | null>;
  /** The current world, saved with the blocks on Export. */
  world: { key: string; track: Track };
  /** Switches to the world an imported file was saved with. */
  onImportWorld: (key: string, track: Track) => void;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
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
      loadBlocksRef.current = (xml) => loadExample(workspace, xml);
    });
    observer.observe(div);

    return () => {
      observer.disconnect();
      getCodeRef.current = null;
      loadBlocksRef.current = null;
      workspaceRef.current?.dispose();
      workspaceRef.current = null;
      setWorkspace(null);
    };
  }, [getCodeRef, loadBlocksRef]);

  const onExport = () => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const file = projectFile(Blockly.serialization.workspaces.save(workspace), world.key, world.track);
    const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `obo-playground-${world.track.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const workspace = workspaceRef.current;
    const file = event.target.files?.[0];
    event.target.value = ""; // lets the same file be picked again
    if (!workspace || !file) return;
    let project;
    try {
      project = readProjectFile(await file.text());
    } catch (err) {
      toast.error((err as Error).message);
      return;
    }
    // load() clears the workspace first, so a file that fails halfway must not cost the student their blocks.
    const before = Blockly.serialization.workspaces.save(workspace);
    try {
      Blockly.serialization.workspaces.load(project.blocks as Blockly.serialization.blocks.State, workspace);
    } catch {
      Blockly.serialization.workspaces.load(before, workspace);
      toast.error("Those blocks couldn't be loaded. Your blocks are unchanged.");
      return;
    }
    if (project.world) onImportWorld(project.world.key, project.world.track);
    toast.success(project.world ? `Imported ${file.name} on ${project.world.track.name}.` : `Imported ${file.name}.`);
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
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} title="Import blocks from a file">
            <Upload aria-hidden="true" className="text-brand-teal" />
            Import
          </Button>
          <Button size="sm" variant="outline" onClick={onExport} title="Save these blocks and their world to a file">
            <Download aria-hidden="true" className="text-brand-teal" />
            Export
          </Button>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={onImport} />
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
