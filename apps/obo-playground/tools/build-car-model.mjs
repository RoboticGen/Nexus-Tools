// Rebuild public/models/obo-car.glb from a checkout of RoboticGen/obo-pcbs:
//
//   node tools/build-car-model.mjs /path/to/obo-pcbs
//
// Reads exports/obo-car-assembly.glb (refresh it with obo-pcbs' tools/export_glb.py), cuts each
// tire out of its N20 motor mesh into its own node so the view can spin it, then joins, simplifies
// and meshopt-compresses the rest like obo-play-sim's tools/build_board_model.sh.

import { mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, flatten, join, meshopt, prune, simplify, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";

const pcbs = process.argv[2];
if (!pcbs) {
  console.error("usage: node tools/build-car-model.mjs /path/to/obo-pcbs");
  process.exit(1);
}
const SRC = path.join(pcbs, "exports/obo-car-assembly.glb");
const OUT = fileURLToPath(new URL("../public/models/obo-car.glb", import.meta.url));

// In the N20 mesh's own frame (mm, x along the axle): only the 6 mm tire and its rim lie past
// x = 10.5, and the wheel is centred on (14.7, 0, 17).
const WHEEL_FROM_X = 10.5;
const WHEEL_CENTRE = [14.7, 0, 17];

await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder });
const doc = await io.read(SRC);
const root = doc.getRoot();
const buffer = root.listBuffers()[0];
const scene = root.getDefaultScene() ?? root.listScenes()[0];

const apply = (m, [x, y, z], w) => [
  m[0] * x + m[4] * y + m[8] * z + m[12] * w,
  m[1] * x + m[5] * y + m[9] * z + m[13] * w,
  m[2] * x + m[6] * y + m[10] * z + m[14] * w,
];
const det3 = (m) =>
  m[0] * (m[5] * m[10] - m[9] * m[6]) - m[4] * (m[1] * m[10] - m[9] * m[2]) + m[8] * (m[1] * m[6] - m[5] * m[2]);

// A new primitive holding only the given triangles. With `xf`, positions and normals are baked
// through `xf.m` and re-centred on `xf.origin`; a mirroring matrix also flips the winding.
function subset(prim, tris, xf) {
  const idx = prim.getIndices()?.getArray();
  const corner = (t, k) => (idx ? idx[t * 3 + k] : t * 3 + k);
  const order = xf && det3(xf.m) < 0 ? [0, 2, 1] : [0, 1, 2];
  const remap = new Map();
  const used = [];
  const outIdx = new Uint32Array(tris.length * 3);
  tris.forEach((t, i) =>
    order.forEach((k, j) => {
      const v = corner(t, k);
      if (!remap.has(v)) {
        remap.set(v, used.length);
        used.push(v);
      }
      outIdx[i * 3 + j] = remap.get(v);
    }),
  );
  const out = doc.createPrimitive().setMaterial(prim.getMaterial()).setMode(prim.getMode());
  for (const sem of prim.listSemantics()) {
    const a = prim.getAttribute(sem);
    const n = a.getElementSize();
    const src = a.getArray();
    const dst = new src.constructor(used.length * n);
    used.forEach((v, i) => {
      for (let c = 0; c < n; c++) dst[i * n + c] = src[v * n + c];
    });
    if (xf && (sem === "POSITION" || sem === "NORMAL")) {
      if (!(dst instanceof Float32Array)) throw new Error(`${sem} is not float; can't bake the wheel`);
      for (let i = 0; i < used.length; i++) {
        const p = apply(xf.m, [dst[i * 3], dst[i * 3 + 1], dst[i * 3 + 2]], sem === "POSITION" ? 1 : 0);
        if (sem === "POSITION") {
          dst.set([p[0] - xf.origin[0], p[1] - xf.origin[1], p[2] - xf.origin[2]], i * 3);
        } else {
          const len = Math.hypot(...p) || 1;
          dst.set([p[0] / len, p[1] / len, p[2] / len], i * 3);
        }
      }
    }
    out.setAttribute(sem, doc.createAccessor().setType(a.getType()).setNormalized(a.getNormalized()).setArray(dst).setBuffer(buffer));
  }
  const indices = used.length > 65535 ? outIdx : Uint16Array.from(outIdx);
  return out.setIndices(doc.createAccessor().setType("SCALAR").setArray(indices).setBuffer(buffer));
}

const motors = root.listNodes().filter((n) => n.getName().endsWith("N20 Motor and Wheel"));
if (motors.length !== 2 || motors[0].getMesh() !== motors[1].getMesh()) {
  throw new Error(`expected two nodes sharing one "N20 Motor and Wheel" mesh, found ${motors.length}`);
}
const motorMesh = motors[0].getMesh();

// Split every primitive of the shared mesh into motor and wheel triangles by centroid x.
const split = motorMesh.listPrimitives().map((prim) => {
  const pos = prim.getAttribute("POSITION").getArray();
  const idx = prim.getIndices()?.getArray();
  const count = (idx ? idx.length : pos.length / 3) / 3;
  const wheel = [];
  const motor = [];
  for (let t = 0; t < count; t++) {
    let x = 0;
    for (let k = 0; k < 3; k++) x += pos[(idx ? idx[t * 3 + k] : t * 3 + k) * 3];
    (x / 3 > WHEEL_FROM_X ? wheel : motor).push(t);
  }
  return { prim, wheel, motor };
});

const wheels = motors.map((node) => {
  const m = node.getWorldMatrix();
  const centre = apply(m, WHEEL_CENTRE, 1);
  const mesh = doc.createMesh();
  for (const { prim, wheel } of split) if (wheel.length) mesh.addPrimitive(subset(prim, wheel, { m, origin: centre }));
  return { centre, mesh };
});
// glTF +X is the car's right (forward is -Z), so the wheel with the smaller x is the left one.
wheels.sort((a, b) => a.centre[0] - b.centre[0]);
const wheelNodes = ["wheel_left", "wheel_right"].map((name, i) => {
  wheels[i].mesh.setName(name);
  const n = doc.createNode(name).setMesh(wheels[i].mesh).setTranslation(wheels[i].centre);
  scene.addChild(n);
  return n;
});

for (const { prim, motor } of split) {
  motorMesh.addPrimitive(subset(prim, motor));
  motorMesh.removePrimitive(prim);
  prim.dispose();
}

// join() keeps named nodes apart: name only the wheels so everything else merges.
for (const n of root.listNodes()) if (!wheelNodes.includes(n)) n.setName("");
for (const m of root.listMeshes()) if (!wheels.some((w) => w.mesh === m)) m.setName("");

await doc.transform(
  dedup(),
  flatten(),
  join({ keepNamed: true }),
  weld(),
  simplify({ simplifier: MeshoptSimplifier, error: 0.003 }),
  prune(),
  meshopt({ encoder: MeshoptEncoder, level: "medium" }),
);

mkdirSync(path.dirname(OUT), { recursive: true });
await io.write(OUT, doc);
const prims = root.listMeshes().flatMap((m) => m.listPrimitives());
const tris = prims.reduce((s, p) => s + (p.getIndices()?.getCount() ?? 0) / 3, 0);
console.log(
  `${path.relative(process.cwd(), OUT)}: ${(statSync(OUT).size / 1e6).toFixed(2)} MB, ` +
    `${prims.length} draw calls, ${Math.round(tris)} triangles, wheels at ` +
    wheels.map((w) => w.centre.map((v) => (v * 1000).toFixed(1)).join(",")).join(" / ") + " mm",
);
