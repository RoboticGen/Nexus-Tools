"use client";

import { CameraControls, Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { BOOM, boomLift, booms, railHalfLength, TRAIN_LENGTH, trainSpan, type Crossing } from "@/sim/crossing";
import { NEAR_WALL, RIDE_H, SENSOR_SITES, WALL_H, WALL_T, type SensorDir } from "@/sim/mujoco-world";
import { offsetLoop, type Point, type Track, type Wall } from "@/sim/track";

import { OboCar } from "./obo-car";

import type { PlaygroundSim } from "@/sim/playground-sim";
import type { CleanGrid, Coverage } from "@/sim/room";

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
  tape: string;
  dirt: string;
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
    tape: "#1f2022",
    dirt: "#a68a64",
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
    tape: "#c4cacf",
    dirt: "#7a6448",
    nose: "#fdb713",
    rayClear: "#43b268",
    rayNear: "#f87171",
  },
};

const DIRS = Object.keys(SENSOR_SITES) as SensorDir[];
const FOV = 50;

// A flat ribbon 1 mm above the grid lines, so it never z-fights with them from the top view.
function Tape({ line, width, color }: { line: Point[]; width: number; color: string }) {
  const geometry = useMemo(() => {
    const { inner, outer } = offsetLoop(line, width);
    const n = line.length;
    const pos: number[] = [];
    const index: number[] = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      pos.push(outer[i][0], 0, -outer[i][1], inner[i][0], 0, -inner[i][1]);
      index.push(2 * i, 2 * i + 1, 2 * j, 2 * j, 2 * i + 1, 2 * j + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(index);
    g.computeVertexNormals();
    return g;
  }, [line, width]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position-y={0.002} receiveShadow>
      <meshStandardMaterial color={color} roughness={0.9} side={THREE.DoubleSide} />
    </mesh>
  );
}

// Open tape, one strip per segment; each runs half a width past its ends so joints come out square.
function TapeSegments({ segments, width, color }: { segments: Wall[]; width: number; color: string }) {
  return segments.map((w, i) => (
    <mesh
      key={i}
      position={[(w.x1 + w.x2) / 2, 0.002, -(w.y1 + w.y2) / 2]}
      rotation-y={Math.atan2(w.y2 - w.y1, w.x2 - w.x1)}
      receiveShadow
    >
      <boxGeometry args={[Math.hypot(w.x2 - w.x1, w.y2 - w.y1) + width, 0.0005, width]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  ));
}

const RAIL = { gauge: 0.09, color: "#8d949a", sleeper: "#6b5444", red: "#dc2626", white: "#f8fafc" };
const TRAIN_CARS = ["#219cbc", "#022f49", "#219cbc"];
// Red and white bands about 7 cm long, as many as fit the arm.
const stripes = (reach: number) => {
  const n = Math.max(1, Math.round(reach / 0.067));
  return Array<number>(n).fill(reach / n);
};

// Rails, booms, warning lights and the train, all driven by the world's clock each frame.
function CrossingMeshes({ sim, crossing, extent }: { sim: PlaygroundSim; crossing: Crossing; extent: number }) {
  const armRefs = useRef<(THREE.Group | null)[]>([]);
  const lightRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const train = useRef<THREE.Group>(null);
  const len = railHalfLength(extent) * 2;
  const sleepers = useMemo(() => {
    const ys: number[] = [];
    for (let y = -len / 2; y <= len / 2; y += 0.07) {
      if (crossing.roads.every((road) => Math.abs(y - road.y) > BOOM.side - 0.08)) ys.push(y);
    }
    return ys;
  }, [len, crossing.roads]);
  const gates = booms(crossing);

  useFrame(() => {
    const t = sim.worldTime();
    const lift = boomLift(t);
    gates.forEach((b, i) => {
      const arm = armRefs.current[i];
      if (arm) arm.rotation.x = (b.dir * lift * Math.PI) / 2;
    });
    const blink = lift < 1 && Math.floor(t * 2) % 2 === 0;
    lightRefs.current.forEach((m, i) => m?.emissive.set(lift < 1 && (i % 2 === 0) === blink ? RAIL.red : "#000000"));
    const span = trainSpan(t, len / 2);
    if (train.current) {
      train.current.visible = span !== null;
      if (span) train.current.position.z = -(span[0] + span[1]) / 2; // three's z is -y
    }
  });

  return (
    <group>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[crossing.x + (side * RAIL.gauge) / 2, 0.005, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.006, 0.008, len]} />
          <meshStandardMaterial color={RAIL.color} metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
      {sleepers.map((y) => (
        <mesh key={y} position={[crossing.x, 0.002, -y]} receiveShadow>
          <boxGeometry args={[RAIL.gauge + 0.05, 0.003, 0.025]} />
          <meshStandardMaterial color={RAIL.sleeper} roughness={0.9} />
        </mesh>
      ))}
      {gates.map((b, i) => (
        <group key={i} position={[b.x, 0, -b.y]}>
          <mesh position-y={(BOOM.height + 0.03) / 2} castShadow>
            <boxGeometry args={[0.02, BOOM.height + 0.03, 0.02]} />
            <meshStandardMaterial color={RAIL.white} roughness={0.5} />
          </mesh>
          {[0, 1].map((k) => (
            <mesh key={k} position={[0, BOOM.height + 0.045, (k - 0.5) * 0.026]}>
              <sphereGeometry args={[0.009, 16, 12]} />
              <meshStandardMaterial ref={(m) => { lightRefs.current[i * 2 + k] = m; }} color="#3f1d1d" emissiveIntensity={2.5} />
            </mesh>
          ))}
          {/* the arm swings about the road's direction; three's x is physics x, so the angle carries over */}
          <group ref={(g) => { armRefs.current[i] = g; }} position-y={BOOM.height}>
            {stripes(b.reach).map((len, k) => (
              <mesh key={k} position-z={-b.dir * len * (k + 0.5)} castShadow>
                <boxGeometry args={[BOOM.half * 2, BOOM.half * 2, len]} />
                <meshStandardMaterial color={k % 2 ? RAIL.white : RAIL.red} roughness={0.5} />
              </mesh>
            ))}
          </group>
        </group>
      ))}
      <group ref={train} position-x={crossing.x} visible={false}>
        {TRAIN_CARS.map((color, k) => (
          <mesh key={k} position={[0, 0.045, (k - 1) * (TRAIN_LENGTH / 3)]} castShadow>
            <boxGeometry args={[0.1, 0.07, TRAIN_LENGTH / 3 - 0.02]} />
            <meshStandardMaterial color={color} roughness={0.45} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

const FURNITURE = ["#b5654a", "#8a6a4f", "#219cbc", "#fdb713"];

// Dust over the floor that still needs cleaning, repainted only when the coverage changes.
function Dirt({ sim, grid, color }: { sim: PlaygroundSim; grid: CleanGrid; color: string }) {
  const { cols, rows, cell, x0, y0 } = grid;
  const texture = useMemo(() => {
    const t = new THREE.DataTexture(new Uint8Array(cols * rows * 4), cols, rows);
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearFilter;
    return t;
  }, [cols, rows]);
  useEffect(() => () => texture.dispose(), [texture]);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const painted = useRef<{ cov: Coverage | null; version: number; color: string }>({ cov: null, version: -1, color });

  useFrame(() => {
    const cov = sim.race.coverage;
    const map = material.current?.map;
    const last = painted.current;
    if (!cov || !map || cov.grid !== grid || (cov === last.cov && cov.version === last.version && color === last.color)) return;
    painted.current = { cov, version: cov.version, color };
    const c = new THREE.Color(color);
    const px = (map as THREE.DataTexture).image.data as Uint8Array;
    for (let i = 0; i < grid.dirty.length; i++) {
      px.set([c.r * 255, c.g * 255, c.b * 255, grid.dirty[i] && !cov.cleaned[i] ? 150 : 0], i * 4);
    }
    map.needsUpdate = true;
  });

  return (
    <mesh rotation-x={-Math.PI / 2} position={[x0 + (cols * cell) / 2, 0.0015, -(y0 + (rows * cell) / 2)]} receiveShadow>
      <planeGeometry args={[cols * cell, rows * cell]} />
      <meshStandardMaterial ref={material} map={texture} transparent depthWrite={false} roughness={1} />
    </mesh>
  );
}

function TrackMeshes({ sim, track, colors }: { sim: PlaygroundSim; track: Track; colors: SceneColors }) {
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
      {track.furniture?.map((f, i) => (
        <mesh key={i} position={[f.x, f.h / 2, -f.y]} castShadow receiveShadow>
          <boxGeometry args={[f.hx * 2, f.h, f.hy * 2]} />
          <meshStandardMaterial color={FURNITURE[i % FURNITURE.length]} roughness={0.8} />
        </mesh>
      ))}
      {track.clean && <Dirt sim={sim} grid={track.clean} color={colors.dirt} />}
      {track.line && <Tape line={track.line.points} width={track.line.width} color={colors.tape} />}
      {track.tape && <TapeSegments segments={track.tape.segments} width={track.tape.width} color={colors.tape} />}
      {track.crossing && <CrossingMeshes sim={sim} crossing={track.crossing} extent={track.extent} />}
      {track.goal && (
        <mesh position={[track.goal.x, 0.002, -track.goal.y]}>
          <boxGeometry args={[track.goal.r * 1.6, 0.003, track.goal.r * 1.6]} />
          <meshStandardMaterial color={colors.goal} emissive={colors.goal} emissiveIntensity={0.3} />
        </mesh>
      )}
      {line && (
        <mesh
          position={[(line.ax + line.bx) / 2, 0.0015, -(line.ay + line.by) / 2]}
          rotation-y={Math.atan2(line.by - line.ay, line.bx - line.ax)}
        >
          <boxGeometry args={[Math.hypot(line.bx - line.ax, line.by - line.ay), 0.002, 0.05]} />
          {/* gold on line tracks: white would vanish against the light-grey dark-theme tape */}
          <meshStandardMaterial color={track.line ? colors.nose : colors.startLine} transparent opacity={0.7} />
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
      <OboCar sim={sim} />
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
    // Fog distances run from the camera, so they follow the zoom; fixed, zooming out fogs the whole track.
    const fog = get().scene.fog as THREE.Fog | null;
    if (fog) {
      fog.near = c.distance + track.extent;
      fog.far = c.distance + track.extent * 3;
    }
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
      maxDistance={track.extent * 8}
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
      {/* only in chase: the top view sits farther out than the far side of the track */}
      {view.name === "chase" && (
        <fog key={`fog-${colors.background}`} attach="fog" args={[colors.background, track.extent, track.extent * 3]} />
      )}
      <hemisphereLight args={["#ffffff", colors.floor, 1.1]} />
      <directionalLight
        key={track.extent} // remount so the shadow camera takes the new bounds
        position={[1.5, 2.75, 1]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0002}
        shadow-camera-near={0.1}
        shadow-camera-far={10}
        shadow-camera-left={-track.extent}
        shadow-camera-right={track.extent}
        shadow-camera-top={track.extent}
        shadow-camera-bottom={-track.extent}
      />
      {/* Studio lighting for the car's PCB, copper and plastic, as OBO Lab lights the OBO PLAY */}
      <Environment resolution={128} frames={1}>
        <Lightformer intensity={2.2} position={[0, 5, -9]} scale={[10, 5, 1]} />
        <Lightformer intensity={1.2} position={[-6, 2, 4]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} color="#e6f3ff" />
        <Lightformer intensity={0.8} position={[6, 3, 4]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} />
      </Environment>
      <TrackMeshes sim={sim} track={track} colors={colors} />
      <Robot sim={sim} colors={colors} />
      <CameraRig sim={sim} track={track} view={view} />
    </Canvas>
  );
}
