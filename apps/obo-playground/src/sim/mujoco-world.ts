// MuJoCo model of the robot car + the track walls, generated as MJCF from the track.
// Physics frame: x forward, y left, z up (MuJoCo's convention). The car's geometry lives in
// the constants below so the 3D view draws exactly what is simulated.


import { loadMujoco } from "./load-mujoco";

import type { Track } from "./track";
import type { MainModule, MjData, MjModel } from "@mujoco/mujoco";

type Vec3 = readonly [number, number, number];

export const RIDE_H = 0.2; // body origin height = wheel radius, so the wheels touch the ground
export const WHEEL = { radius: 0.2, halfWidth: 0.045, y: 0.31 } as const;
export const CASTER = { radius: 0.09, x: 0.34, z: -0.1 } as const;
export const BODY_BOXES = {
  chassis: { pos: [0, 0, 0.04], half: [0.42, 0.27, 0.05] },
  nose: { pos: [0.44, 0, 0.03], half: [0.1, 0.16, 0.04] },
  keel: { pos: [0, 0, -0.1], half: [0.34, 0.2, 0.03] },
} as const satisfies Record<string, { pos: Vec3; half: Vec3 }>;
// Mounted forward of the wheel discs so the beams never start inside the car's own wheels.
export const SENSOR_SITES = {
  front: { pos: [0.46, 0, 0.12], dir: [1, 0, 0] },
  left: { pos: [0.3, 0.26, 0.12], dir: [0, 1, 0] },
  right: { pos: [0.3, -0.26, 0.12], dir: [0, -1, 0] },
} as const satisfies Record<string, { pos: Vec3; dir: Vec3 }>;
export const WALL_H = 0.6;
export const WALL_T = 0.12; // half-thickness
export const SENSOR_RANGE = 20;
const MAX_WHEEL_OMEGA = 18; // rad/s at motor ±1 (~3.6 m/s)

export type SensorDir = keyof typeof SENSOR_SITES;
export type Sensors = Record<SensorDir, number>;
export interface Pose {
  x: number;
  y: number;
  theta: number;
  speed: number;
  omega: number;
}

const f3 = (v: Vec3) => v.join(" ");

function buildMJCF(track: Track): string {
  const wh = track.wallHeight ?? WALL_H;
  const walls = track.walls
    .map((w, i) => {
      const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
      const ang = Math.atan2(w.y2 - w.y1, w.x2 - w.x1);
      return `<geom name="wall${i}" type="box" pos="${(w.x1 + w.x2) / 2} ${(w.y1 + w.y2) / 2} ${wh / 2}" euler="0 0 ${ang}" size="${len / 2 + WALL_T} ${WALL_T} ${wh / 2}"/>`;
    })
    .join("\n");
  const posts = (track.posts ?? [])
    .map(([x, y], i) => `<geom name="post${i}" type="box" pos="${x} ${y} ${wh / 2}" size="${WALL_T * 1.4} ${WALL_T * 1.4} ${wh / 2}"/>`)
    .join("\n");
  const s = track.start;
  const box = (name: keyof typeof BODY_BOXES, mass: number) =>
    `<geom name="${name}" type="box" pos="${f3(BODY_BOXES[name].pos)}" size="${f3(BODY_BOXES[name].half)}" mass="${mass}"/>`;
  const site = (name: SensorDir) =>
    `<site name="s_${name}" pos="${f3(SENSOR_SITES[name].pos)}" zaxis="${f3(SENSOR_SITES[name].dir)}" size="0.02"/>`;
  const wheel = (side: "l" | "r", y: number) => `
      <body name="wheel_${side}" pos="0 ${y} 0">
        <joint name="j_wheel_${side}" type="hinge" axis="0 1 0"/>
        <geom type="cylinder" fromto="0 ${-WHEEL.halfWidth} 0 0 ${WHEEL.halfWidth} 0" size="${WHEEL.radius}" mass="0.5" friction="3.0 0.02 0.001"/>
      </body>`;
  // Casters sit 1 cm above the ground: the wheels carry the weight, casters only catch a pitch.
  const caster = (name: string, x: number) =>
    `<geom name="${name}" type="sphere" size="${CASTER.radius}" pos="${x} 0 ${CASTER.z}" mass="0.15" friction="0.02 0.005 0.0001"/>`;

  return `<mujoco model="obo-playground">
  <compiler angle="radian"/>
  <option timestep="0.005" gravity="0 0 -9.81" integrator="RK4"/>
  <default><geom friction="1.2 0.01 0.001"/></default>
  <worldbody>
    <geom name="floor" type="plane" size="${track.extent + 6} ${track.extent + 6} 0.1" friction="1.4 0.01 0.001"/>
    ${walls}
    ${posts}
    <body name="car" pos="${s.x} ${s.y} ${RIDE_H}" quat="${Math.cos(s.heading / 2)} 0 0 ${Math.sin(s.heading / 2)}">
      <freejoint name="root"/>
      ${box("chassis", 1.4)}
      ${box("nose", 0.15)}
      ${box("keel", 2.4)}
      ${site("front")}
      ${site("left")}
      ${site("right")}
      ${wheel("l", WHEEL.y)}
      ${wheel("r", -WHEEL.y)}
      ${caster("caster_f", CASTER.x)}
      ${caster("caster_r", -CASTER.x)}
    </body>
  </worldbody>
  <actuator>
    <velocity name="m_left" joint="j_wheel_l" kv="2.5" ctrlrange="-${MAX_WHEEL_OMEGA} ${MAX_WHEEL_OMEGA}"/>
    <velocity name="m_right" joint="j_wheel_r" kv="2.5" ctrlrange="-${MAX_WHEEL_OMEGA} ${MAX_WHEEL_OMEGA}"/>
  </actuator>
  <sensor>
    <rangefinder name="r_front" site="s_front" cutoff="${SENSOR_RANGE}"/>
    <rangefinder name="r_left" site="s_left" cutoff="${SENSOR_RANGE}"/>
    <rangefinder name="r_right" site="s_right" cutoff="${SENSOR_RANGE}"/>
  </sensor>
</mujoco>`;
}

const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));

export class MujocoWorld {
  ready = false;
  timestep = 0.005;
  private mj: MainModule | null = null;
  private model: MjModel | null = null;
  private data: MjData | null = null;
  private motorL = 0;
  private motorR = 0;
  private pose: Pose;

  constructor(private track: Track) {
    this.pose = { x: track.start.x, y: track.start.y, theta: track.start.heading, speed: 0, omega: 0 };
  }

  async init(): Promise<void> {
    const mj = await loadMujoco();
    this.mj = mj;
    this.model = mj.MjModel.from_xml_string(buildMJCF(this.track));
    this.data = new mj.MjData(this.model);
    this.timestep = this.model.opt.timestep;
    this.ready = true;
    this.reset();
  }

  reset() {
    const { mj, model, data } = this;
    if (!mj || !model || !data) return;
    mj.mj_resetData(model, data);
    const s = this.track.start;
    const q = data.qpos;
    q[0] = s.x; q[1] = s.y; q[2] = RIDE_H;
    q[3] = Math.cos(s.heading / 2); q[4] = 0; q[5] = 0; q[6] = Math.sin(s.heading / 2);
    mj.mj_forward(model, data);
    this.readPose();
  }

  setMotors(left: number, right: number) {
    this.motorL = clamp1(left);
    this.motorR = clamp1(right);
  }

  // Advance exactly one MuJoCo timestep; the caller owns real-time pacing.
  step() {
    const { mj, model, data } = this;
    if (!mj || !model || !data) return;
    data.ctrl[0] = this.motorL * MAX_WHEEL_OMEGA;
    data.ctrl[1] = this.motorR * MAX_WHEEL_OMEGA;
    mj.mj_step(model, data);
    this.readPose();
  }

  private readPose() {
    const q = this.data!.qpos;
    const v = this.data!.qvel; // free joint: [vx, vy, vz, wx, wy, wz], world frame
    const [w, qx, qy, qz] = [q[3], q[4], q[5], q[6]];
    this.pose = {
      x: q[0],
      y: q[1],
      theta: Math.atan2(2 * (w * qz + qx * qy), 1 - 2 * (qy * qy + qz * qz)),
      speed: Math.hypot(v[0], v[1]),
      omega: v[5],
    };
  }

  getPose(): Pose {
    return this.pose;
  }

  getSensors(): Sensors {
    const sd = this.data?.sensordata;
    // rangefinders report -1 when nothing is within the cutoff
    const read = (i: number) => (!sd || sd[i] < 0 ? SENSOR_RANGE : Math.min(SENSOR_RANGE, sd[i]));
    return { front: read(0), left: read(1), right: read(2) };
  }

  dispose() {
    this.data?.delete();
    this.model?.delete();
    this.data = null;
    this.model = null;
    this.ready = false;
  }
}
