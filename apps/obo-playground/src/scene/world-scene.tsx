"use client";

import { CameraControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { BODY_BOXES, CASTER, RIDE_H, SENSOR_SITES, WALL_H, WALL_T, WHEEL, type SensorDir } from "@/sim/mujoco-world";

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
  body: string;
  nose: string;
  dark: string;
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
    body: "#e87a55",
    nose: "#fdb713",
    dark: "#1f2022",
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
    body: "#e87a55",
    nose: "#fdb713",
    dark: "#121314",
    rayClear: "#43b268",
    rayNear: "#f87171",
  },
};

const DIRS = Object.keys(SENSOR_SITES) as SensorDir[];
const NEAR_WALL = 1.2;

function TrackMeshes({ track, colors }: { track: Track; colors: SceneColors }) {
  const wh = track.wallHeight ?? WALL_H;
  const size = track.extent * 2 + 12;
  const line = track.startLine;
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color={colors.floor} roughness={1} />
      </mesh>
      <gridHelper key={colors.grid} args={[size, Math.round(size), colors.grid, colors.grid]} position-y={0.01} />
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
        <mesh key={i} position={[x, (wh + 0.06) / 2, -y]} castShadow>
          <boxGeometry args={[WALL_T * 2.6, wh + 0.06, WALL_T * 2.6]} />
          <meshStandardMaterial color={colors.post} roughness={0.5} />
        </mesh>
      ))}
      {track.goal && (
        <mesh position={[track.goal.x, 0.03, -track.goal.y]}>
          <boxGeometry args={[(track.cell ?? 2.5) * 0.8, 0.05, (track.cell ?? 2.5) * 0.8]} />
          <meshStandardMaterial color={colors.goal} emissive={colors.goal} emissiveIntensity={0.3} />
        </mesh>
      )}
      {line && (
        <mesh
          position={[(line.ax + line.bx) / 2, 0.03, -(line.ay + line.by) / 2]}
          rotation-y={Math.atan2(line.by - line.ay, line.bx - line.ax)}
        >
          <boxGeometry args={[Math.hypot(line.bx - line.ax, line.by - line.ay), 0.04, 0.55]} />
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
      {Object.entries(BODY_BOXES).map(([name, b]) => (
        <mesh key={name} position={[b.pos[0], b.pos[2], -b.pos[1]]} castShadow>
          <boxGeometry args={[b.half[0] * 2, b.half[2] * 2, b.half[1] * 2]} />
          <meshStandardMaterial
            color={name === "nose" ? colors.nose : name === "keel" ? colors.dark : colors.body}
            roughness={0.5}
          />
        </mesh>
      ))}
      {[WHEEL.y, -WHEEL.y].map((y) => (
        <mesh key={y} position={[0, 0, -y]} rotation-x={Math.PI / 2} castShadow>
          <cylinderGeometry args={[WHEEL.radius, WHEEL.radius, WHEEL.halfWidth * 2, 24]} />
          <meshStandardMaterial color={colors.dark} roughness={0.8} />
        </mesh>
      ))}
      {[CASTER.x, -CASTER.x].map((x) => (
        <mesh key={x} position={[x, CASTER.z, 0]}>
          <sphereGeometry args={[CASTER.radius, 16, 12]} />
          <meshStandardMaterial color={colors.dark} roughness={0.6} />
        </mesh>
      ))}
      {DIRS.map((dir) => {
        const p = SENSOR_SITES[dir].pos;
        return (
          <mesh key={dir} position={[p[0], p[2], -p[1]]}>
            <boxGeometry args={[0.08, 0.06, 0.08]} />
            <meshStandardMaterial color={colors.dark} />
          </mesh>
        );
      })}
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

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const p = sim.pose();
    if (view.name === "top") {
      c.setLookAt(0, track.extent * 2, 0.01, 0, 0, 0, false);
    } else {
      const back = 7;
      c.setLookAt(p.x - Math.cos(p.theta) * back, 4.2, -(p.y - Math.sin(p.theta) * back), p.x, 0.4, -p.y, false);
    }
    last.current = { x: p.x, y: p.y };
  }, [sim, track, view]);

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
      minDistance={1.5}
      maxDistance={160}
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
    <Canvas shadows dpr={[1, 2]} camera={{ fov: 50, near: 0.1, far: 400, position: [0, 20, 20] }} resize={{ debounce: 0 }}>
      <color key={colors.background} attach="background" args={[colors.background]} />
      <fog key={`fog-${colors.background}`} attach="fog" args={[colors.background, 45, 120]} />
      <hemisphereLight args={["#ffffff", colors.floor, 1.1]} />
      <directionalLight
        position={[12, 22, 8]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />
      <TrackMeshes track={track} colors={colors} />
      <Robot sim={sim} colors={colors} />
      <CameraRig sim={sim} track={track} view={view} />
    </Canvas>
  );
}
