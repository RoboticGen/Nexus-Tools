"use client";

import { CameraControls, Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { RIDE_H, SENSOR_SITES, WALL_H, WALL_T, type SensorDir } from "@/sim/mujoco-world";

import { OboCar } from "./obo-car";

import type { PlaygroundSim } from "@/sim/playground-sim";
import type { Track } from "@/sim/track";

// Physics is x forward, y left, z up; three.js is y up. Every position below maps
// physics (x, y, z) to three (x, z, -y): a rotation, so left stays left on screen.

export type CameraView = "chase" | "top";

export interface SceneColors {
  background: string;
  floor: string;
  grid: string;
  wall: string;
  post: string;
  goal: string;
  startLine: string;
  nose: string;
  rayClear: string;
  rayNear: string;
}

export const SCENE_COLORS: Record<"light" | "dark", SceneColors> = {
  light: {
    background: "#f1f4f6",
    floor: "#e3e8eb",
    grid: "#cfd8de",
    wall: "#219cbc",
    post: "#022f49",
    goal: "#43b268",
    startLine: "#ffffff",
    nose: "#fdb713",
    rayClear: "#1c6e3d",
    rayNear: "#dc2626",
  },
  dark: {
    background: "#1f2022",
    floor: "#2a2c2e",
    grid: "#383b3e",
    wall: "#219cbc",
    post: "#939598",
    goal: "#43b268",
    startLine: "#e3e8eb",
    nose: "#fdb713",
    rayClear: "#43b268",
    rayNear: "#f87171",
  },
};

const DIRS = Object.keys(SENSOR_SITES) as SensorDir[];
const FOV = 50;
const NEAR_WALL = 0.15;

function TrackMeshes({ track, colors }: { track: Track; colors: SceneColors }) {
  const wh = track.wallHeight ?? WALL_H;
  const size = track.extent * 2 + 1.5;
  const line = track.startLine;
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color={colors.floor} roughness={1} />
      </mesh>
      <gridHelper key={colors.grid} args={[size, Math.round(size * 10), colors.grid, colors.grid]} position-y={0.001} />
      {track.walls.map((w, i) => (
        <mesh
          key={i}
          position={[(w.x1 + w.x2) / 2, wh / 2, -(w.y1 + w.y2) / 2]}
          rotation-y={Math.atan2(w.y2 - w.y1, w.x2 - w.x1)}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[Math.hypot(w.x2 - w.x1, w.y2 - w.y1) + WALL_T * 2, wh, WALL_T * 2]} />
          <meshStandardMaterial color={colors.wall} roughness={0.6} />
        </mesh>
      ))}
      {track.posts?.map(([x, y], i) => (
        <mesh key={i} position={[x, (wh + 0.008) / 2, -y]} castShadow>
          <boxGeometry args={[WALL_T * 2.6, wh + 0.008, WALL_T * 2.6]} />
          <meshStandardMaterial color={colors.post} roughness={0.5} />
        </mesh>
      ))}
      {track.goal && (
        <mesh position={[track.goal.x, 0.002, -track.goal.y]}>
          <boxGeometry args={[(track.cell ?? 0.3) * 0.8, 0.003, (track.cell ?? 0.3) * 0.8]} />
          <meshStandardMaterial color={colors.goal} emissive={colors.goal} emissiveIntensity={0.3} />
        </mesh>
      )}
      {line && (
        <mesh
          position={[(line.ax + line.bx) / 2, 0.0015, -(line.ay + line.by) / 2]}
          rotation-y={Math.atan2(line.by - line.ay, line.bx - line.ax)}
        >
          <boxGeometry args={[Math.hypot(line.bx - line.ax, line.by - line.ay), 0.002, 0.05]} />
          <meshStandardMaterial color={colors.startLine} transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  );
}

function Robot({ sim, colors }: { sim: PlaygroundSim; colors: SceneColors }) {
  const group = useRef<THREE.Group>(null);
  const rays = useMemo(() => {
    const make = () => {
      const l = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
        new THREE.LineBasicMaterial(),
      );
      l.frustumCulled = false; // endpoints move every frame; the bounding sphere would go stale
      return l;
    };
    return { front: make(), left: make(), right: make() } satisfies Record<SensorDir, THREE.Line>;
  }, []);

  useEffect(
    () => () => {
      for (const l of Object.values(rays)) {
        l.geometry.dispose();
        (l.material as THREE.Material).dispose();
      }
    },
    [rays],
  );

  // The sim advances here, once per rendered frame; it paces itself on the frame's delta.
  useFrame((_, delta) => {
    sim.advance(delta);
    const p = sim.pose();
    group.current?.position.set(p.x, RIDE_H, -p.y);
    if (group.current) group.current.rotation.y = p.theta;
    for (const dir of DIRS) {
      const { pos, dir: d } = SENSOR_SITES[dir];
      const dist = sim.sensors[dir];
      const attr = rays[dir].geometry.getAttribute("position") as THREE.BufferAttribute;
      attr.setXYZ(0, pos[0], pos[2], -pos[1]);
      attr.setXYZ(1, pos[0] + d[0] * dist, pos[2] + d[2] * dist, -(pos[1] + d[1] * dist));
      attr.needsUpdate = true;
      (rays[dir].material as THREE.LineBasicMaterial).color.set(dist < NEAR_WALL ? colors.rayNear : colors.rayClear);
    }
  });

  return (
    <group ref={group}>
      <Suspense fallback={null}>
        <OboCar sim={sim} />
      </Suspense>
      {DIRS.map((dir) => (
        <primitive key={dir} object={rays[dir]} />
      ))}
    </group>
  );
}

const tmpPos = new THREE.Vector3();
const tmpTarget = new THREE.Vector3();

// Chase follows the car (orbit freely, the car stays framed); top shows the whole track.
function CameraRig({ sim, track, view }: { sim: PlaygroundSim; track: Track; view: { name: CameraView; nonce: number } }) {
  const ref = useRef<CameraControls>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const get = useThree((s) => s.get);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const p = sim.pose();
    if (view.name === "top") {
      // high enough to fit the track across the panel's narrower side
      const { width, height } = get().size;
      const h = track.extent / Math.tan(((FOV / 2) * Math.PI) / 180) / Math.min(1, width / height);
      c.setLookAt(0, h, 0.001, 0, 0, 0, false);
    } else {
      const back = 0.55;
      c.setLookAt(p.x - Math.cos(p.theta) * back, 0.3, -(p.y - Math.sin(p.theta) * back), p.x, 0.03, -p.y, false);
    }
    last.current = { x: p.x, y: p.y };
  }, [sim, track, view, get]);

  useFrame(() => {
    const c = ref.current;
    const p = sim.pose();
    const prev = last.current;
    last.current = { x: p.x, y: p.y };
    if (!c || !prev || view.name !== "chase") return;
    const dx = p.x - prev.x;
    const dz = -(p.y - prev.y);
    if (!dx && !dz) return;
    c.getPosition(tmpPos);
    c.getTarget(tmpTarget);
    c.setLookAt(tmpPos.x + dx, tmpPos.y, tmpPos.z + dz, tmpTarget.x + dx, tmpTarget.y, tmpTarget.z + dz, false);
  });

  return (
    <CameraControls
      ref={ref}
      makeDefault
      minDistance={0.15}
      maxDistance={15}
      maxPolarAngle={Math.PI / 2 - 0.04}
      smoothTime={0.2}
    />
  );
}

export function WorldScene({
  sim,
  track,
  view,
  colors,
}: {
  sim: PlaygroundSim;
  track: Track;
  view: { name: CameraView; nonce: number };
  colors: SceneColors;
}) {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ fov: FOV, near: 0.005, far: 50, position: [0, 2.5, 2.5] }} resize={{ debounce: 0 }}>
      <color key={colors.background} attach="background" args={[colors.background]} />
      <fog key={`fog-${colors.background}`} attach="fog" args={[colors.background, 6, 15]} />
      <hemisphereLight args={["#ffffff", colors.floor, 1.1]} />
      <directionalLight
        position={[1.5, 2.75, 1]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0002}
        shadow-camera-near={0.1}
        shadow-camera-far={10}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
      />
      {/* Studio lighting for the car's PCB, copper and plastic, as OBO Lab lights the OBO PLAY */}
      <Environment resolution={128} frames={1}>
        <Lightformer intensity={2.2} position={[0, 5, -9]} scale={[10, 5, 1]} />
        <Lightformer intensity={1.2} position={[-6, 2, 4]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} color="#e6f3ff" />
        <Lightformer intensity={0.8} position={[6, 3, 4]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} />
      </Environment>
      <TrackMeshes track={track} colors={colors} />
      <Robot sim={sim} colors={colors} />
      <CameraRig sim={sim} track={track} view={view} />
    </Canvas>
  );
}
