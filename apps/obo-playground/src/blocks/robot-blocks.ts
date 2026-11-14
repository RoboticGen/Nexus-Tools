// Robot blocks, their JS generators, toolbox and theme. The generated program is the body of a
// function that runs once per control tick with a `robot` object (see `RobotApi`).
// Client-only: Blockly's server build pulls in jsdom.

import { darkComponentStyles } from "@nexus-tools/blockly-python-generator";
import { BRAND, BRAND_DEEP, TONE } from "@nexus-tools/design-system/lib/palette";
import * as Blockly from "blockly";
import { javascriptGenerator, Order } from "blockly/javascript";

Blockly.common.defineBlocksWithJsonArray([
  {
    type: "robot_drive",
    message0: "drive  speed %1  turn %2",
    args0: [
      { type: "input_value", name: "SPEED", check: "Number" },
      { type: "input_value", name: "TURN", check: "Number" },
    ],
    previousStatement: null,
    nextStatement: null,
    style: "robot_blocks",
    tooltip: "Drive forward at speed (-1 to 1) while turning (-1 left … 1 right).",
  },
  {
    type: "robot_set_motors",
    message0: "set motors  left %1  right %2",
    args0: [
      { type: "input_value", name: "L", check: "Number" },
      { type: "input_value", name: "R", check: "Number" },
    ],
    previousStatement: null,
    nextStatement: null,
    style: "robot_blocks",
    tooltip: "Set each wheel motor from -1 (full reverse) to 1 (full forward).",
  },
  {
    type: "robot_stop",
    message0: "stop",
    previousStatement: null,
    nextStatement: null,
    style: "robot_blocks",
    tooltip: "Stop both motors.",
  },
  {
    type: "robot_sensor",
    message0: "distance %1 cm",
    args0: [
      {
        type: "field_dropdown",
        name: "DIR",
        options: [
          ["front", "front"],
          ["left", "left"],
          ["right", "right"],
        ],
      },
    ],
    output: "Number",
    style: "sensor_blocks",
    tooltip: "Distance in centimetres to the nearest wall in that direction (up to 400, like the real ultrasonic sensor).",
  },
  {
    type: "robot_line",
    message0: "line sensor %1",
    args0: [{ type: "field_dropdown", name: "INDEX", options: ["0", "1", "2", "3", "4", "5"].map((i) => [i, i]) }],
    output: "Number",
    style: "sensor_blocks",
    tooltip: "1 when this IR sensor is over the line, 0 when it isn't. 0 is the leftmost sensor, 5 the rightmost.",
  },
  {
    type: "robot_speed",
    message0: "my speed cm/s",
    output: "Number",
    style: "sensor_blocks",
    tooltip: "Current speed of the car in centimetres per second.",
  },
  {
    type: "robot_time",
    message0: "time running",
    output: "Number",
    style: "sensor_blocks",
    tooltip: "Seconds since the program started running.",
  },
]);

javascriptGenerator.forBlock.robot_drive = (block, gen) =>
  `robot.drive(${gen.valueToCode(block, "SPEED", Order.NONE) || "0"}, ${gen.valueToCode(block, "TURN", Order.NONE) || "0"});\n`;
javascriptGenerator.forBlock.robot_set_motors = (block, gen) =>
  `robot.setMotors(${gen.valueToCode(block, "L", Order.NONE) || "0"}, ${gen.valueToCode(block, "R", Order.NONE) || "0"});\n`;
javascriptGenerator.forBlock.robot_stop = () => "robot.setMotors(0, 0);\n";
javascriptGenerator.forBlock.robot_sensor = (block) => [
  `robot.sensor(${JSON.stringify(block.getFieldValue("DIR"))})`,
  Order.FUNCTION_CALL,
];
javascriptGenerator.forBlock.robot_line = (block) => [
  `robot.line(${Number(block.getFieldValue("INDEX"))})`,
  Order.FUNCTION_CALL,
];
javascriptGenerator.forBlock.robot_speed = () => ["robot.speed()", Order.FUNCTION_CALL];
javascriptGenerator.forBlock.robot_time = () => ["robot.time()", Order.FUNCTION_CALL];
javascriptGenerator.addReservedWords("robot");

export function compileWorkspace(workspace: Blockly.Workspace): string {
  return javascriptGenerator.workspaceToCode(workspace);
}

// Deep hues: Blockly paints every block label white, so each colour must clear 4.5:1 on white.
export const theme = Blockly.Theme.defineTheme("obo-playground", {
  name: "obo-playground",
  base: Blockly.Themes.Classic,
  categoryStyles: {
    robot_category: { colour: BRAND_DEEP.teal },
    sensor_category: { colour: BRAND.navy },
    logic_category: { colour: BRAND_DEEP.sky },
    math_category: { colour: BRAND_DEEP.green },
    loop_category: { colour: BRAND_DEEP.gold },
    variable_category: { colour: BRAND_DEEP.coral },
  },
  blockStyles: {
    robot_blocks: { colourPrimary: BRAND_DEEP.teal },
    sensor_blocks: { colourPrimary: BRAND.navy },
    logic_blocks: { colourPrimary: BRAND_DEEP.sky },
    math_blocks: { colourPrimary: BRAND_DEEP.green },
    loop_blocks: { colourPrimary: BRAND_DEEP.gold },
    variable_blocks: { colourPrimary: BRAND_DEEP.coral },
    variable_dynamic_blocks: { colourPrimary: BRAND_DEEP.coral },
    procedure_blocks: { colourPrimary: TONE.danger },
  },
});

export const darkTheme = Blockly.Theme.defineTheme("obo-playground-dark", {
  name: "obo-playground-dark",
  base: theme,
  componentStyles: darkComponentStyles,
});

const num = (n: number) => ({ shadow: { type: "math_number", fields: { NUM: n } } });

export const toolbox = {
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category",
      name: "Robot",
      categorystyle: "robot_category",
      contents: [
        { kind: "block", type: "robot_drive", inputs: { SPEED: num(0.6), TURN: num(0) } },
        { kind: "block", type: "robot_set_motors", inputs: { L: num(0.5), R: num(0.5) } },
        { kind: "block", type: "robot_stop" },
      ],
    },
    {
      kind: "category",
      name: "Sensors",
      categorystyle: "sensor_category",
      contents: [
        { kind: "block", type: "robot_sensor" },
        { kind: "block", type: "robot_line" },
        { kind: "block", type: "robot_speed" },
        { kind: "block", type: "robot_time" },
      ],
    },
    {
      kind: "category",
      name: "Logic",
      categorystyle: "logic_category",
      contents: [
        { kind: "block", type: "controls_if" },
        { kind: "block", type: "logic_compare" },
        { kind: "block", type: "logic_operation" },
        { kind: "block", type: "logic_boolean" },
      ],
    },
    {
      kind: "category",
      name: "Math",
      categorystyle: "math_category",
      contents: [
        { kind: "block", type: "math_number", fields: { NUM: 0.5 } },
        { kind: "block", type: "math_arithmetic", inputs: { A: num(1), B: num(1) } },
      ],
    },
    {
      kind: "category",
      name: "Loops",
      categorystyle: "loop_category",
      contents: [{ kind: "block", type: "controls_repeat_ext", inputs: { TIMES: num(4) } }],
    },
    { kind: "category", name: "Variables", categorystyle: "variable_category", custom: "VARIABLE" },
  ],
};
