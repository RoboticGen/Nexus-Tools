// MJCF for the OBO Car (copied from RoboticGen/obo_car_description models/obo_car.xml; keep in
// step) and the track walls. Frame: x forward, y left, z up, metres.

import { loadMujoco } from "./load-mujoco";

import type { Track } from "./track";
import type { MainModule, MjData, MjModel } from "@mujoco/mujoco";

type Vec3 = readonly [number, number, number];

export const RIDE_H = 0.017; // the body origin is the axle midpoint, one wheel radius up
// HC-SR04 sensing faces (origin of each us_*_mount body in obo_car.xml) and boresights.
export const SENSOR_SITES = {
  front: { pos: [0.08356, 0.00034, 0.02576], dir: [1, 0, 0] },
  left: { pos: [0.04891, 0.04999, 0.02526], dir: [0, 1, 0] },
  right: { pos: [0.04915, -0.04969, 0.02576], dir: [0, -1, 0] },
} as const satisfies Record<string, { pos: Vec3; dir: Vec3 }>;
export const WALL_H = 0.08;
export const WALL_T = 0.01; // half-thickness
export const SENSOR_RANGE = 4; // HC-SR04 maximum, metres
export const NEAR_WALL = 0.15; // the dashboard and the rays turn red closer than this
const MAX_WHEEL_OMEGA = 30; // rad/s at motor ±1, like a 300 rpm N20
export const TOP_SPEED = MAX_WHEEL_OMEGA * RIDE_H; // m/s; RIDE_H is the wheel radius

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
  const wheel = (side: "left" | "right", y: number) => `
      <body name="wheel_${side}" pos="0 ${y} 0">
        <joint name="j_wheel_${side}" type="hinge" axis="0 1 0"/>
        <inertial pos="0 0 0" mass="0.006" diaginertia="4.705e-7 8.670e-7 4.705e-7"/>
        <geom type="cylinder" size="0.017 0.0043" euler="1.5707963268 0 0" friction="1.0 0.005 0.0001"/>
      </body>`;
  // The site's +Z is the rangefinder's ray, so Ry(90°) points it along the mount's +X boresight.
  const sonar = (dir: SensorDir) => {
    const { pos, dir: d } = SENSOR_SITES[dir];
    return `
      <body name="us_${dir}_mount" pos="${f3(pos)}" euler="0 0 ${Math.atan2(d[1], d[0])}">
        <inertial pos="-0.00743 0 -0.00020" mass="0.007" diaginertia="1.4216e-06 3.7181e-07 1.3127e-06"/>
        <geom type="box" size="0.007505 0.02250 0.01015" pos="-0.00743 0 -0.00020"/>
        <site name="us_${dir}" euler="0 1.5707963268 0" size="0.0015"/>
      </body>`;
  };

  // The floor is fully transparent so mj_ray, and with it the rangefinders, ignores it: sonars
  // 43 mm up would otherwise hit the floor whenever the car pitches a degree under braking.
  return `<mujoco model="obo-playground">
  <compiler angle="radian"/>
  <option timestep="0.002" integrator="implicitfast"/>
  <worldbody>
    <geom name="floor" type="plane" size="${track.extent + 0.5} ${track.extent + 0.5} 0.05" rgba="1 1 1 0"/>
    ${walls}
    ${posts}
    <body name="car" pos="${s.x} ${s.y} ${RIDE_H}" quat="${Math.cos(s.heading / 2)} 0 0 ${Math.sin(s.heading / 2)}">
      <freejoint name="root"/>
      <inertial pos="0.01273 0.00021 0.00353" mass="0.141" diaginertia="1.2539e-04 1.6636e-04 2.7269e-04"/>
      <geom name="chassis" type="box" size="0.057765 0.049650 0.014240" pos="0.03249 0.00035 0.00647"/>
      <body name="caster_ball" pos="0.05680 -0.00107 -0.011">
        <joint name="j_caster" type="ball"/>
        <inertial pos="0 0 0" mass="0.002" diaginertia="2.88e-8 2.88e-8 2.88e-8"/>
        <geom name="caster" type="sphere" size="0.006" friction="1.0 0.005 0.0001"/>
      </body>
      ${wheel("left", 0.05768)}
      ${wheel("right", -0.05768)}
      ${sonar("front")}
      ${sonar("left")}
      ${sonar("right")}
    </body>
  </worldbody>
  <actuator>
    <velocity name="m_left" joint="j_wheel_left" kv="0.002" ctrlrange="-${MAX_WHEEL_OMEGA} ${MAX_WHEEL_OMEGA}"/>
    <velocity name="m_right" joint="j_wheel_right" kv="0.002" ctrlrange="-${MAX_WHEEL_OMEGA} ${MAX_WHEEL_OMEGA}"/>
  </actuator>
  <sensor>
    <rangefinder name="r_front" site="us_front" cutoff="${SENSOR_RANGE}"/>
    <rangefinder name="r_left" site="us_left" cutoff="${SENSOR_RANGE}"/>
    <rangefinder name="r_right" site="us_right" cutoff="${SENSOR_RANGE}"/>
  </sensor>
</mujoco>`;
}

const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));

export class MujocoWorld {
  ready = false;
  timestep = 0.002;
  private mj: MainModule | null = null;
  private model: MjModel | null = null;
  private data: MjData | null = null;
  private motorL = 0;
  private motorR = 0;
  private wheelQpos: [number, number] = [0, 0];
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
    const joint = (name: string) => this.model!.jnt_qposadr[mj.mj_name2id(this.model!, mj.mjtObj.mjOBJ_JOINT.value, name)];
    this.wheelQpos = [joint("j_wheel_left"), joint("j_wheel_right")];
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

  // Wheel rotation in radians about the car's left (+y) axis; positive rolls forward.
  getWheelAngles(): [number, number] {
    const q = this.data?.qpos;
    return q ? [q[this.wheelQpos[0]], q[this.wheelQpos[1]]] : [0, 0];
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
