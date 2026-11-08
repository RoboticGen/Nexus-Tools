"use client";

// The real OBO Car (car + IR panel) from RoboticGen/obo-pcbs, built by tools/build-car-model.mjs
// in the car's own frame: axle midpoint at the origin, x forward, y up, z right.

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Component, Suspense, useLayoutEffect, useMemo, type ReactNode } from "react";

import type { PlaygroundSim } from "@/sim/playground-sim";
import type * as THREE from "three";

const MODEL = "/models/obo-car.glb";

function CarModel({ sim }: { sim: PlaygroundSim }) {
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
    // The axle is +z (the car's right), so rolling forward is a negative turn about it.
    wheels.forEach((w, i) => {
      if (w) w.rotation.z = -angles[i];
    });
  });

  return <primitive object={scene} />;
}

// A blocked or failed .glb download must not take the whole page down: drive the chassis box.
class ModelBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(err: unknown) {
    console.error("OBO Car model failed to load:", err);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <mesh position={[0.03249, 0.00647, -0.00035]} castShadow>
        <boxGeometry args={[0.1155, 0.0285, 0.0993]} />
        <meshStandardMaterial color="#2448a8" roughness={0.6} />
      </mesh>
    );
  }
}

export function OboCar({ sim }: { sim: PlaygroundSim }) {
  return (
    <ModelBoundary>
      <Suspense fallback={null}>
        <CarModel sim={sim} />
      </Suspense>
    </ModelBoundary>
  );
}

if (typeof window !== "undefined") useGLTF.preload(MODEL, false, true);
