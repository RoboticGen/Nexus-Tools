"use client";

import { BlocklyDialogs } from "@nexus-tools/design-system/components/blockly-dialogs";
import { WorkspaceColumn, WorkspaceLayout } from "@nexus-tools/design-system/components/ui/workspace-layout";
import { WorkspaceNavbar } from "@nexus-tools/design-system/components/workspace-navbar";
import { useTheme } from "@nexus-tools/design-system/hooks/use-theme";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Dashboard } from "@/components/dashboard";
import { ExamplesMenu, type Example } from "@/components/examples-menu";
import { WorldPanel } from "@/components/world-panel";
import { SCENE_COLORS, type CameraView } from "@/scene/world-scene";
import { PlaygroundSim } from "@/sim/playground-sim";
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

  const onRun = useCallback(() => {
    if (sim.mode !== "program") {
      toast.info("Switch to Program mode to run blocks.");
      return;
    }
    if (sim.running) sim.stop();
    else sim.run(getCodeRef.current?.() ?? "");
  }, [sim]);

  // An example sets up both halves, as in OBO Lab: its blocks and the world they were written for.
  const onPickExample = (example: Example) => {
    loadBlocksRef.current?.(example.xml);
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
        <BlocksEditor
          getCodeRef={getCodeRef}
          loadBlocksRef={loadBlocksRef}
          world={{ key: trackKey, track }}
          onImportWorld={(key, t) => applyTrack(t, key)}
        />
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
