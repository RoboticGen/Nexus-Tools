"use client";

import { BlocklyDialogs } from "@nexus-tools/design-system/components/blockly-dialogs";
import { CodeEditor } from "@nexus-tools/design-system/components/code-editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@nexus-tools/design-system/components/ui/tabs";
import { Terminal } from "@nexus-tools/design-system/components/ui/terminal";
import { WorkspaceColumn, WorkspaceLayout } from "@nexus-tools/design-system/components/ui/workspace-layout";
import { WorkspaceNavbar } from "@nexus-tools/design-system/components/workspace-navbar";
import { useTheme } from "@nexus-tools/design-system/hooks/use-theme";
import { getSkulpt, loadSkulptLibrary } from "@nexus-tools/skulpt-executor";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { PYTHON_EXAMPLE } from "@/blocks/examples";
import { Dashboard } from "@/components/dashboard";
import { ExamplesMenu, type Example } from "@/components/examples-menu";
import { WorldPanel } from "@/components/world-panel";
import { SCENE_COLORS, type CameraView } from "@/scene/world-scene";
import { PlaygroundSim } from "@/sim/playground-sim";
import { pythonProgram } from "@/sim/python-program";
import { TRACK_PRESETS, trackFromPreset, type Track } from "@/sim/track";

const BlocksEditor = dynamic(() => import("@/components/blocks-editor").then((m) => m.BlocksEditor), {
  ssr: false,
  loading: () => <div className="text-muted-foreground flex h-full items-center justify-center">Loading blocks…</div>,
});

declare global {
  interface Window {
    __oboPlayground?: PlaygroundSim;
  }
}

const PYTHON_KEY = "obo-playground.python";

// Storage can throw (blocked site data, sandboxed iframes); the editor must still work.
function loadPython() {
  try {
    return localStorage.getItem(PYTHON_KEY) ?? PYTHON_EXAMPLE;
  } catch {
    return PYTHON_EXAMPLE;
  }
}

// Keys typed into a field or the block editor must not drive the car or switch the camera.
const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) ||
    !!target.closest(".injectionDiv, .blocklyWidgetDiv"));

export default function Home() {
  const { resolvedTheme } = useTheme();
  const colors = SCENE_COLORS[resolvedTheme];
  const [sim] = useState(
    () => new PlaygroundSim(trackFromPreset("oval"), ({ tone, message }) => toast[tone](message)),
  );
  const [track, setTrack] = useState<Track>(sim.track);
  const [trackKey, setTrackKey] = useState("oval");
  const [view, setView] = useState<{ name: CameraView; nonce: number }>({ name: "chase", nonce: 0 });
  const getCodeRef = useRef<(() => string) | null>(null);
  const loadBlocksRef = useRef<((xml: string) => void) | null>(null);
  const snap = useSyncExternalStore(sim.subscribe, sim.getSnapshot, sim.getSnapshot);
  const [editor, setEditor] = useState<"blocks" | "python">("blocks");
  const [running, setRunning] = useState(editor); // the program started last, whichever tab is open now
  const [pyCode, setPyCode] = useState(loadPython);
  const [pyOutput, setPyOutput] = useState("");

  const onPyChange = useCallback((code: string) => {
    setPyCode(code);
    try {
      localStorage.setItem(PYTHON_KEY, code);
    } catch {
      // not saved this time; nothing else depends on it
    }
  }, []);

  // The wasm engine loads on the client only; dispose() lets a remount build a fresh world.
  useEffect(() => {
    void sim.setTrack(sim.track);
    window.__oboPlayground = sim; // for debugging and advanced lessons
    return () => sim.dispose();
  }, [sim]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if (e.key.startsWith("Arrow")) {
        sim.keys.add(e.key);
        if (sim.mode === "manual") e.preventDefault();
      } else if (e.key === "1" || e.key === "2") {
        setView((v) => ({ name: e.key === "1" ? "chase" : "top", nonce: v.nonce + 1 }));
      }
    };
    const up = (e: KeyboardEvent) => sim.keys.delete(e.key);
    const blur = () => sim.keys.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [sim]);

  const applyTrack = useCallback(
    (next: Track, key: string) => {
      setTrack(next);
      setTrackKey(key);
      void sim.setTrack(next);
    },
    [sim],
  );

  const runPython = useCallback(async () => {
    if (!pyCode.trim()) {
      toast.info("Write some code first!");
      return;
    }
    try {
      await loadSkulptLibrary();
    } catch {
      toast.error("Python couldn't load. Check your connection and try again.");
      return;
    }
    setPyOutput("");
    sim.run(() => pythonProgram(getSkulpt(), pyCode, (text) => setPyOutput((out) => out + text)));
  }, [sim, pyCode]);

  const onRun = useCallback(() => {
    if (sim.mode !== "program") {
      toast.info(`Switch to Program mode to run your ${editor === "python" ? "code" : "blocks"}.`);
      return;
    }
    if (sim.running) return sim.stop();
    setRunning(editor);
    if (editor === "python") void runPython();
    else sim.run(getCodeRef.current?.() ?? "");
  }, [sim, editor, runPython]);

  const onCopyPython = async () => {
    try {
      await navigator.clipboard.writeText(pyCode);
      toast.success("Code copied to clipboard");
    } catch {
      toast.error("Couldn't copy. Select the code and copy it by hand.");
    }
  };

  // main.py is the file the car runs when it powers on.
  const onExportPython = () => {
    const url = URL.createObjectURL(new Blob([pyCode], { type: "text/x-python" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "main.py";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Saved main.py. Copy it to the car next to obocar.py.");
  };

  // An example sets up both halves, as in OBO Lab: its blocks and the world they were written for.
  const onPickExample = (example: Example) => {
    loadBlocksRef.current?.(example.xml);
    setEditor("blocks");
    applyTrack(trackFromPreset(example.track), example.track);
    toast.success(`Loaded “${example.title}” on ${TRACK_PRESETS[example.track].name}. Press Run!`);
  };

  return (
    <WorkspaceLayout
      header={
        <WorkspaceNavbar
          title="Obo Playground"
          logoSrc="/brand/obo-playground-wordmark.webp"
          logoSrcDark="/brand/obo-playground-wordmark-dark.webp"
          actions={<ExamplesMenu onPick={onPickExample} />}
        />
      }
    >
      <WorkspaceColumn grow={3} collapsible collapsedSize={0}>
        <Tabs value={editor} onValueChange={(v) => setEditor(v as typeof editor)} className="h-full flex-col gap-1">
          <TabsList className="mx-1 mt-1 shrink-0">
            <TabsTrigger value="blocks">Blocks</TabsTrigger>
            <TabsTrigger value="python">Python</TabsTrigger>
          </TabsList>
          {/* Both stay mounted so switching keeps the Blockly workspace and the editor's undo history. */}
          <TabsContent value="blocks" forceMount className="min-h-0 data-[state=inactive]:hidden">
            <BlocksEditor
              getCodeRef={getCodeRef}
              loadBlocksRef={loadBlocksRef}
              world={{ key: trackKey, track }}
              onImportWorld={(key, t) => applyTrack(t, key)}
            />
          </TabsContent>
          <TabsContent value="python" forceMount className="flex min-h-0 flex-col gap-1 data-[state=inactive]:hidden">
            <CodeEditor
              className="min-h-0 flex-1"
              code={pyCode}
              onChange={onPyChange}
              onCopy={onCopyPython}
              onExport={onExportPython}
            />
            <Terminal output={pyOutput} label="Program output" placeholder="Your print() output shows here." rows={5} />
          </TabsContent>
        </Tabs>
      </WorkspaceColumn>
      <WorkspaceColumn grow={4}>
        <WorldPanel
          sim={sim}
          snap={snap}
          track={track}
          trackKey={trackKey}
          view={view}
          colors={colors}
          onRun={onRun}
          program={(snap?.running ? running : editor) === "python" ? "Python" : "blocks"}
          onTrackChange={(key) => applyTrack(trackFromPreset(key), key)}
          onViewChange={(name) => setView((v) => ({ name, nonce: v.nonce + 1 }))}
        />
      </WorkspaceColumn>
      <WorkspaceColumn grow={2} collapsible collapsedSize={0}>
        <Dashboard snap={snap} track={track} colors={colors} onApplyTrack={(t) => {
          applyTrack(t, "custom");
          toast.success("Track updated!");
        }} />
      </WorkspaceColumn>

      {/* Routes Blockly's prompt/confirm through design-system dialogs; rendered outside the panel group. */}
      <BlocklyDialogs />
    </WorkspaceLayout>
  );
}
