// The robot blocks as Python for the real car's SDK (from obocar import OBOCar). Blocks run once per
// 16 ms control tick, so the program becomes the body of a while loop that sleeps 16 ms a pass.
// Client-only, like robot-blocks.

import * as Blockly from "blockly";
import { Order, pythonGenerator } from "blockly/python";

import type { Workspace } from "blockly";

import "./robot-blocks";

const py = pythonGenerator;
py.INDENT = "    ";
py.addReservedWords("car,start,time,OBOCar");

// Helper bodies are written with two-space indents: provideFunction_ turns each into one INDENT.
const helper = (name: string, lines: string[]) => py.provideFunction_(name, lines.join("\n"));

// -1 to 1 per wheel, as in the blocks; the SDK takes 0-512 and a direction.
const wheels = () =>
  helper("wheels", [
    `def ${py.FUNCTION_NAME_PLACEHOLDER_}(left, right):`,
    "  left = int(max(-1, min(1, left)) * 512)",
    "  right = int(max(-1, min(1, right)) * 512)",
    "  if left >= 0:",
    "    car.left_motor_forward(left)",
    "  else:",
    "    car.left_motor_backward(-left)",
    "  if right >= 0:",
    "    car.right_motor_forward(right)",
    "  else:",
    "    car.right_motor_backward(-right)",
  ]);

py.forBlock.robot_drive = (block, gen) => {
  const w = wheels();
  const drive = helper("drive", [
    `def ${py.FUNCTION_NAME_PLACEHOLDER_}(speed, turn):`,
    "  # turn > 0 turns right: the left wheel spins faster",
    `  ${w}(speed + turn, speed - turn)`,
  ]);
  return `${drive}(${gen.valueToCode(block, "SPEED", Order.NONE) || "0"}, ${gen.valueToCode(block, "TURN", Order.NONE) || "0"})\n`;
};
py.forBlock.robot_set_motors = (block, gen) =>
  `${wheels()}(${gen.valueToCode(block, "L", Order.NONE) || "0"}, ${gen.valueToCode(block, "R", Order.NONE) || "0"})\n`;
py.forBlock.robot_stop = () => "car.stop()\n";
py.forBlock.robot_sensor = (block) => [`car.get_${block.getFieldValue("DIR")}_distance()`, Order.FUNCTION_CALL];
py.forBlock.robot_line = (block) => [`int(car.ir_line()[${Number(block.getFieldValue("INDEX"))}])`, Order.FUNCTION_CALL];
py.forBlock.robot_time = () => [
  `${helper("seconds", [
    `def ${py.FUNCTION_NAME_PLACEHOLDER_}():`,
    "  return time.ticks_diff(time.ticks_ms(), start) / 1000",
  ])}()`,
  Order.FUNCTION_CALL,
];
// shortcut: the car has no speed sensor, so this is how fast the wall ahead gets closer; enough to
// spot a stall. Upgrade if the SDK gains wheel encoders.
py.forBlock.robot_speed = () => [
  `${helper("speed", [
    `def ${py.FUNCTION_NAME_PLACEHOLDER_}(last=[None, 0]):`,
    "  now = time.ticks_ms()",
    "  front = car.get_front_distance()",
    "  then_front, then = last",
    "  last[0], last[1] = front, now",
    "  if then_front is None or time.ticks_diff(now, then) > 100:",
    "    return 100  # no recent reading to compare with: assume it's moving",
    "  return abs(then_front - front) * 1000 / max(1, time.ticks_diff(now, then))",
  ])}()`,
  Order.FUNCTION_CALL,
];

export function workspaceToPython(ws: Workspace): string {
  const out = py.workspaceToCode(ws);
  // Blockly puts imports, variables and helpers first, then three newlines, then the code.
  const split = out.indexOf("\n\n\n");
  const defs = (split >= 0 ? out.slice(0, split) : "").split("\n");
  const body = (split >= 0 ? out.slice(split + 3) : out).trimEnd();
  const loop = (body || "pass").split("\n").map((line) => (line ? `    ${line}` : line));
  const isImport = (line: string) => /^(import|from) /.test(line);
  const rest = defs.filter((line) => !isImport(line)).join("\n").trim();
  return [
    "from obocar import OBOCar",
    "import time",
    ...defs.filter(isImport),
    "",
    ...(rest ? [rest, ""] : []),
    "car = OBOCar()",
    "start = time.ticks_ms()",
    "",
    "while True:",
    ...loop,
    "    time.sleep_ms(16)",
    "",
  ].join("\n");
}

export function xmlToPython(xml: string): string {
  const ws = new Blockly.Workspace();
  try {
    Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xml), ws);
    return workspaceToPython(ws);
  } finally {
    ws.dispose();
  }
}
