import type { MainModule } from "@mujoco/mujoco";

let modulePromise: Promise<MainModule> | null = null;

// One wasm instance per page; later track switches reuse it.
export function loadMujoco(): Promise<MainModule> {
  modulePromise ??= import("@mujoco/mujoco").then((m) => m.default());
  return modulePromise;
}
