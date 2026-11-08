"use client";

// The real OBO Car: the KiCad export from RoboticGen/obo-pcbs (car + IR panel, every part),
// compressed by tools/build-car-model.mjs with each tire cut out as its own node.

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";

import type { PlaygroundSim } from "@/sim/playground-sim";
import type * as THREE from "three";

const MODEL = "/models/obo-car.glb";
// The GLB keeps KiCad's frame (metres, y up, car forward = -z); this is its axle midpoint.
const AXLE_OFFSET: [number, number, number] = [-0.14975, 0.005085, -0.124586];

export function OboCar({ sim }: { sim: PlaygroundSim }) {
  const { scene } = useGLTF(MODEL, false, true);
  const wheels = useMemo(() => [scene.getObjectByName("wheel_left"), scene.getObjectByName("wheel_right")], [scene]);

  useLayoutEffect(() => {
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) mesh.castShadow = true;
    });
  }, [scene]);

  useFrame(() => {
    const angles = sim.world?.getWheelAngles() ?? [0, 0];
    // glTF +x is the car's right, so rolling forward is a negative turn about it
    wheels.forEach((w, i) => {
      if (w) w.rotation.x = -angles[i];
    });
  });

  // Turning -90° about y points the GLB's forward (-z) along the car's +x.
  return (
    <group rotation-y={-Math.PI / 2}>
      <primitive object={scene} position={AXLE_OFFSET} />
    </group>
  );
}

useGLTF.preload(MODEL, false, true);
