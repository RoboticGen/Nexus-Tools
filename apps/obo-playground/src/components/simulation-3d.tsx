"use client";

import {
  ArcRotateCamera,
  Color4,
  Engine,
  HavokPlugin,
  HemisphericLight,
  HingeConstraint,
  type IPhysicsEnginePluginV2,
  MeshBuilder,
  MeshoptCompression,
  PhysicsAggregate,
  PhysicsBody,
  PhysicsConstraintAxis,
  PhysicsConstraintMotorType,
  PhysicsMotionType,
  PhysicsShapeBox,
  PhysicsShapeCylinder,
  PhysicsShapeType,
  Quaternion,
  Scene,
  SceneLoader,
  StandardMaterial,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import HavokPhysics from "@babylonjs/havok";
import { useEffect, useRef } from "react";

import type { CarEvent } from "@nexus-tools/obocar-wrapper";

const MODEL_URL = "obocar.glb";
const CAR_ROOT_NODE = "OBOCAR v10";
const LEFT_WHEEL_NODE = "Roda 34 mm v2:3";
const RIGHT_WHEEL_NODE = "Roda 34 mm v2:4";

/**
 * The model's own forward axis is X and lateral/axle axis is Z (derived from
 * the actual node geometry: the two drive wheels sit apart on Z, the caster
 * wheel sits far out on X). obocar.py's heading=0 means "facing +Y" in its
 * own 2D coordinate space, so Python's (x, y) maps to world (Z, X) here, not
 * (X, Z). Flip these signs if a visual check shows the car driving/turning
 * mirrored from what the code describes.
 */
const LATERAL_SIGN = 1;
const FORWARD_SIGN = 1;
const HEADING_SIGN = 1;

const GRAVITY = new Vector3(0, -9.81, 0);
const WHEEL_MOTOR_MAX_FORCE = 3;
/**
 * The source CAD/FBX file's native units don't correspond to anything
 * physical (a 34mm wheel measures ~5000 units in the raw mesh data) - so the
 * loaded model is rescaled to make its longest ground-plane dimension this
 * many metres, a plausible size for a small hobby robot car. Physics
 * (gravity, mass, motor force) all assume real metres after this, so this
 * must happen before any physics shapes are built from the model's bounds.
 */
const TARGET_CAR_LENGTH_METERS = 0.28;

interface CarAnimationStep {
  fromPosition: Vector3;
  toPosition: Vector3;
  fromHeadingDeg: number;
  toHeadingDeg: number;
  duration: number;
  elapsed: number;
  /** Target wheel angular speed in rad/s; signed so backward/left-right spins the right way. */
  leftWheelSpeed: number;
  rightWheelSpeed: number;
}

interface WheelRig {
  spinGroup: TransformNode;
  hinge: HingeConstraint;
}

interface Simulation3DProps {
  events: CarEvent[];
}

export function Simulation3D({ events }: Simulation3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const processedCountRef = useRef(0);
  const queueRef = useRef<CarEvent[]>([]);
  const carRootRef = useRef<TransformNode | null>(null);
  const leftWheelRef = useRef<WheelRig | null>(null);
  const rightWheelRef = useRef<WheelRig | null>(null);
  const physicsPluginRef = useRef<IPhysicsEnginePluginV2 | null>(null);
  const currentStepRef = useRef<CarAnimationStep | null>(null);
  const currentHeadingRef = useRef(0);
  const worldScaleRef = useRef(1);

  // Feed newly-arrived events into the animation queue as they come in from the executor.
  useEffect(() => {
    if (events.length > processedCountRef.current) {
      queueRef.current.push(...events.slice(processedCountRef.current));
      processedCountRef.current = events.length;
    }
  }, [events]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;

    // obocar.glb was compressed with meshopt (gltfpack -cc); self-host the
    // decoder instead of Babylon's CDN default so loading doesn't depend on
    // an external network call at runtime - a failed/blocked fetch there
    // silently corrupts every compressed mesh's vertex data.
    MeshoptCompression.Configuration.decoder.url = "/meshopt_decoder.js";

    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.94, 0.96, 0.98, 1);

    const camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 3, 6, Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 100;
    camera.panningSensibility = 200;

    const light = new HemisphericLight("light", new Vector3(0.3, 1, 0.3), scene);
    light.intensity = 0.95;

    const ground = MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, scene);
    const groundMaterial = new StandardMaterial("groundMat", scene);
    groundMaterial.diffuseColor.set(0.85, 0.88, 0.92);
    ground.material = groundMaterial;
    ground.isPickable = false;

    Promise.all([
      HavokPhysics({ locateFile: () => "/HavokPhysics.wasm" }),
      SceneLoader.ImportMeshAsync("", "/", MODEL_URL, scene),
    ])
      .then(([havokInstance]) => {
        if (disposed) return;

        const havokPlugin = new HavokPlugin(true, havokInstance);
        physicsPluginRef.current = havokPlugin;
        scene.enablePhysics(GRAVITY, havokPlugin);

        const carRoot = scene.getTransformNodeByName(CAR_ROOT_NODE);
        if (!carRoot) {
          console.error(`Simulation3D: could not find "${CAR_ROOT_NODE}" node in ${MODEL_URL}`);
          return;
        }
        carRootRef.current = carRoot;

        // Rescale the model from its native CAD units to real metres before
        // anything (physics shapes, camera framing) measures it - see
        // TARGET_CAR_LENGTH_METERS.
        const rawBounds = getLocalBounds(carRoot);
        const rawLength = Math.max(rawBounds.size.x, rawBounds.size.z, 0.001);
        const rescale = TARGET_CAR_LENGTH_METERS / rawLength;
        carRoot.scaling.setAll(rescale);

        // Re-measure post-rescale, in real metres now.
        const carBounds = getLocalBounds(carRoot);
        const carLength = Math.max(carBounds.size.x, carBounds.size.z, 0.001);
        const worldScale = carLength * 2.5;
        worldScaleRef.current = worldScale;

        const groundSize = worldScale * 40;
        ground.scaling.set(groundSize / 100, 1, groundSize / 100);
        new PhysicsAggregate(ground, PhysicsShapeType.MESH, { mass: 0, friction: 0.9, restitution: 0.05 }, scene);

        const worldBounds = carRoot.getHierarchyBoundingVectors(true);
        camera.target = worldBounds.min.add(worldBounds.max).scale(0.5);
        camera.radius = carLength * 1.1;
        camera.lowerRadiusLimit = carLength * 0.4;
        camera.upperRadiusLimit = groundSize * 0.6;

        // Chassis stays kinematic (ANIMATED): we drive its position/heading
        // directly from the exact event data every frame, Havok never moves
        // it with forces. It still needs a physics body so the wheels have
        // something real to hinge against and collide with the ground area.
        const chassisBody = new PhysicsBody(carRoot, PhysicsMotionType.ANIMATED, false, scene);
        chassisBody.shape = new PhysicsShapeBox(carBounds.center, Quaternion.Identity(), carBounds.size, scene);
        chassisBody.setMassProperties({ mass: 1 });

        leftWheelRef.current = setUpWheelRig(carRoot, chassisBody, LEFT_WHEEL_NODE, havokPlugin);
        rightWheelRef.current = setUpWheelRig(carRoot, chassisBody, RIGHT_WHEEL_NODE, havokPlugin);
      })
      .catch((err) => {
        console.error("Simulation3D: failed to initialize physics/model", err);
      });

    engine.runRenderLoop(() => {
      const deltaSeconds = engine.getDeltaTime() / 1000;
      stepAnimation(deltaSeconds);
      scene.render();
    });

    function stepAnimation(deltaSeconds: number) {
      const carRoot = carRootRef.current;
      if (!carRoot) return;

      if (!currentStepRef.current && queueRef.current.length > 0) {
        const event = queueRef.current.shift()!;
        currentStepRef.current = buildStep(event, currentHeadingRef.current, carRoot.position, worldScaleRef.current);
      }

      const step = currentStepRef.current;
      if (!step) return;

      step.elapsed += deltaSeconds;
      const t = step.duration > 0 ? Math.min(1, step.elapsed / step.duration) : 1;

      carRoot.position = Vector3.Lerp(step.fromPosition, step.toPosition, t);
      const headingDeg = step.fromHeadingDeg + (step.toHeadingDeg - step.fromHeadingDeg) * t;
      carRoot.rotation.y = HEADING_SIGN * ((headingDeg * Math.PI) / 180);
      currentHeadingRef.current = headingDeg;

      setWheelMotorSpeed(leftWheelRef.current, physicsPluginRef.current, step.leftWheelSpeed);
      setWheelMotorSpeed(rightWheelRef.current, physicsPluginRef.current, step.rightWheelSpeed);

      if (t >= 1) currentStepRef.current = null;
    }

    const resize = () => engine.resize();
    window.addEventListener("resize", resize);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    return () => {
      disposed = true;
      window.removeEventListener("resize", resize);
      resizeObserver.disconnect();
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="simulation-canvas" />;
}

interface LocalBounds {
  center: Vector3;
  size: Vector3;
}

/** Bounding box of a node's mesh hierarchy, expressed in the node's own local space. */
function getLocalBounds(node: TransformNode): LocalBounds {
  const bounds = node.getHierarchyBoundingVectors(true);
  const invWorld = node.computeWorldMatrix(true).clone().invert();
  const localMin = Vector3.TransformCoordinates(bounds.min, invWorld);
  const localMax = Vector3.TransformCoordinates(bounds.max, invWorld);
  return {
    center: localMin.add(localMax).scale(0.5),
    size: localMax.subtract(localMin),
  };
}

/**
 * Builds one drive wheel's physics rig: isolates its spin from the baked
 * manufacturing-orientation rotation by re-parenting it under a fresh
 * identity-rotation node at the same position (the wheel pair sits apart on
 * the chassis's local Z axis, so that group's local Z is the axle direction),
 * gives it a dynamic cylinder body, and hinges it to the kinematic chassis
 * body with a velocity motor along that axle.
 */
function setUpWheelRig(
  carRoot: TransformNode,
  chassisBody: PhysicsBody,
  wheelNodeName: string,
  physicsPlugin: IPhysicsEnginePluginV2
): WheelRig | null {
  const scene = carRoot.getScene();
  const wheelPivot = scene.getTransformNodeByName(wheelNodeName);
  if (!wheelPivot) {
    console.error(`Simulation3D: could not find wheel node "${wheelNodeName}"`);
    return null;
  }

  const spinGroup = new TransformNode(`${wheelNodeName}__spin`, scene);
  spinGroup.parent = carRoot;
  spinGroup.position = wheelPivot.position.clone();

  wheelPivot.parent = spinGroup;
  wheelPivot.position = Vector3.Zero();

  const wheelBounds = getLocalBounds(spinGroup);
  const radius = Math.max(wheelBounds.size.x, wheelBounds.size.y) / 2;
  const halfThickness = wheelBounds.size.z / 2;
  const pointA = new Vector3(wheelBounds.center.x, wheelBounds.center.y, wheelBounds.center.z - halfThickness);
  const pointB = new Vector3(wheelBounds.center.x, wheelBounds.center.y, wheelBounds.center.z + halfThickness);

  const wheelBody = new PhysicsBody(spinGroup, PhysicsMotionType.DYNAMIC, false, scene);
  wheelBody.shape = new PhysicsShapeCylinder(pointA, pointB, radius, scene);
  wheelBody.setMassProperties({ mass: 0.3 });

  // Pivot in the chassis's local space is just the spin group's position
  // (it's a direct child); pivot in the wheel body's own space is its origin.
  const axis = new Vector3(0, 0, 1);
  const hinge = new HingeConstraint(spinGroup.position.clone(), Vector3.Zero(), axis, axis, scene);
  wheelBody.addConstraint(chassisBody, hinge);
  physicsPlugin.setAxisMotorType(hinge, PhysicsConstraintAxis.ANGULAR_X, PhysicsConstraintMotorType.VELOCITY);
  physicsPlugin.setAxisMotorMaxForce(hinge, PhysicsConstraintAxis.ANGULAR_X, WHEEL_MOTOR_MAX_FORCE);

  return { spinGroup, hinge };
}

function setWheelMotorSpeed(rig: WheelRig | null, physicsPlugin: IPhysicsEnginePluginV2 | null, speed: number) {
  if (!rig || !physicsPlugin) return;
  physicsPlugin.setAxisMotorTarget(rig.hinge, PhysicsConstraintAxis.ANGULAR_X, speed);
}

function buildStep(
  event: CarEvent,
  currentHeadingDeg: number,
  currentPosition: Vector3,
  worldScale: number
): CarAnimationStep | null {
  const toWorld = (position: [number, number]) =>
    new Vector3(LATERAL_SIGN * position[0] * worldScale, 0, FORWARD_SIGN * position[1] * worldScale);

  const wheelRadius = worldScale * 0.15; // approx wheel radius relative to car size

  switch (event.type) {
    case "reset":
    case "stopped": {
      const pos = toWorld(event.position);
      return {
        fromPosition: pos,
        toPosition: pos,
        fromHeadingDeg: event.heading,
        toHeadingDeg: event.heading,
        duration: 0,
        elapsed: 0,
        leftWheelSpeed: 0,
        rightWheelSpeed: 0,
      };
    }
    case "car_moved": {
      const toPosition = toWorld(event.position);
      const linearSpeed = (event.distance * worldScale) / Math.max(event.duration, 0.001);
      const angularSpeed = linearSpeed / wheelRadius;
      return {
        fromPosition: currentPosition.clone(),
        toPosition,
        fromHeadingDeg: currentHeadingDeg,
        toHeadingDeg: event.heading,
        duration: event.duration,
        elapsed: 0,
        leftWheelSpeed: angularSpeed,
        rightWheelSpeed: angularSpeed,
      };
    }
    case "car_turned": {
      const turnRate = Math.abs(event.degrees) / Math.max(event.duration, 0.001);
      const angularSpeed = ((turnRate * Math.PI) / 180) * worldScale * 2 / wheelRadius;
      const sign = event.direction === "left" ? -1 : 1;
      return {
        fromPosition: currentPosition.clone(),
        toPosition: currentPosition.clone(),
        fromHeadingDeg: currentHeadingDeg,
        toHeadingDeg: event.heading,
        duration: event.duration,
        elapsed: 0,
        leftWheelSpeed: -sign * angularSpeed,
        rightWheelSpeed: sign * angularSpeed,
      };
    }
    default:
      return null;
  }
}
