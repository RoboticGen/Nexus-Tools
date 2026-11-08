// node tools/build-car-model.mjs /path/to/obo-pcbs  ->  public/models/obo-car.glb, in the car's own
// frame (axle midpoint at the origin, x forward, y up) with each tire as a node that can spin.

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
const mul = (a, b) =>
  Array.from({ length: 16 }, (_, i) => [0, 1, 2, 3].reduce((s, k) => s + a[k * 4 + (i % 4)] * b[Math.floor(i / 4) * 4 + k], 0));
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

// KiCad's frame has the car facing -z at an arbitrary spot on the sheet; move it into the car's
// frame: axle midpoint at the origin, then turn -90° about y so forward is +x and right is +z.
const worlds = motors.map((node) => node.getWorldMatrix());
const centres = worlds.map((w) => apply(w, WHEEL_CENTRE, 1));
const [cx, cy, cz] = [0, 1, 2].map((k) => (centres[0][k] + centres[1][k]) / 2);
const F = [0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, cz, -cy, -cx, 1];
const frame = doc.createNode().setRotation([0, -Math.SQRT1_2, 0, Math.SQRT1_2]).setTranslation([cz, -cy, -cx]);
for (const child of scene.listChildren()) {
  scene.removeChild(child);
  frame.addChild(child);
}
scene.addChild(frame);

const wheels = worlds.map((w, i) => {
  const m = mul(F, w);
  const centre = apply(F, centres[i], 1);
  const mesh = doc.createMesh();
  for (const { prim, wheel } of split) if (wheel.length) mesh.addPrimitive(subset(prim, wheel, { m, origin: centre }));
  // A different motor model would cut in the wrong place: insist on a 17 mm wheel round its axle.
  const pos = mesh.listPrimitives().flatMap((q) => Array.from(q.getAttribute("POSITION").getArray()));
  const xs = pos.filter((_, k) => k % 3 === 0);
  const ys = pos.filter((_, k) => k % 3 === 1);
  const r = Math.max(...xs.map((x, k) => Math.hypot(x, ys[k])));
  const skew = Math.max(Math.abs(Math.max(...xs) + Math.min(...xs)), Math.abs(Math.max(...ys) + Math.min(...ys)));
  if (r < 0.016 || r > 0.018 || skew > 0.001) throw new Error(`wheel cut looks wrong: radius ${r}, off-axle ${skew}`);
  return { centre, mesh };
});
// In the car's frame +z is right, so the wheel with the smaller z is the left one.
wheels.sort((a, b) => a.centre[2] - b.centre[2]);
const wheelNodes = ["wheel_left", "wheel_right"].map((name, i) => {
  wheels[i].mesh.setName(name);
  const n = doc.createNode(name).setMesh(wheels[i].mesh).setTranslation(wheels[i].centre);
  scene.addChild(n);
  return n;
});

for (const { prim, motor } of split) {
  if (motor.length) motorMesh.addPrimitive(subset(prim, motor));
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
