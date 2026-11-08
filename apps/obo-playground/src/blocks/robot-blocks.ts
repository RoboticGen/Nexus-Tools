// Robot blocks, their JS generators, toolbox and theme. The generated program is the body of a
// function that runs once per control tick with a `robot` object (see `RobotApi`).
// Client-only: Blockly's server build pulls in jsdom.

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

// A proportional "stay centred, slow for walls" driver: steer toward the open side, go fast
// when the way ahead is clear, capped so the car keeps steering authority.
export const EXAMPLE_XML = `
<xml xmlns="https://developers.google.com/blockly/xml">
  <variables>
    <variable id="vspeed">speed</variable>
    <variable id="vturn">turn</variable>
  </variables>
  <block type="variables_set" x="40" y="40">
    <field name="VAR" id="vturn">turn</field>
    <value name="VALUE">
      <block type="math_arithmetic">
        <field name="OP">MULTIPLY</field>
        <value name="A">
          <block type="math_arithmetic">
            <field name="OP">MINUS</field>
            <value name="A"><block type="robot_sensor"><field name="DIR">right</field></block></value>
            <value name="B"><block type="robot_sensor"><field name="DIR">left</field></block></value>
          </block>
        </value>
        <value name="B"><block type="math_number"><field name="NUM">0.04</field></block></value>
      </block>
    </value>
    <next>
      <block type="variables_set">
        <field name="VAR" id="vspeed">speed</field>
        <value name="VALUE">
          <block type="math_arithmetic">
            <field name="OP">MULTIPLY</field>
            <value name="A"><block type="robot_sensor"><field name="DIR">front</field></block></value>
            <value name="B"><block type="math_number"><field name="NUM">0.02</field></block></value>
          </block>
        </value>
        <next>
          <block type="controls_if">
            <value name="IF0">
              <block type="logic_compare">
                <field name="OP">GT</field>
                <value name="A"><block type="variables_get"><field name="VAR" id="vspeed">speed</field></block></value>
                <value name="B"><block type="math_number"><field name="NUM">0.85</field></block></value>
              </block>
            </value>
            <statement name="DO0">
              <block type="variables_set">
                <field name="VAR" id="vspeed">speed</field>
                <value name="VALUE"><block type="math_number"><field name="NUM">0.85</field></block></value>
              </block>
            </statement>
            <next>
              <block type="robot_drive">
                <value name="SPEED"><block type="variables_get"><field name="VAR" id="vspeed">speed</field></block></value>
                <value name="TURN"><block type="variables_get"><field name="VAR" id="vturn">turn</field></block></value>
              </block>
            </next>
          </block>
        </next>
      </block>
    </next>
  </block>
</xml>`;

// Steer toward the half of the IR array that sees more of the line, slow down when an outer sensor
// sees it (sharp curves), and spin in place to find it again when no sensor does.
export const LINE_EXAMPLE_XML = `
<xml xmlns="https://developers.google.com/blockly/xml">
  <variables>
    <variable id="vleft">left</variable>
    <variable id="vright">right</variable>
    <variable id="vturn">turn</variable>
    <variable id="vspeed">speed</variable>
  </variables>
  <block type="variables_set" x="40" y="40">
    <field name="VAR" id="vleft">left</field>
    <value name="VALUE">
      <block type="math_arithmetic">
        <field name="OP">ADD</field>
        <value name="A">
          <block type="math_arithmetic">
            <field name="OP">ADD</field>
            <value name="A"><block type="robot_line"><field name="INDEX">0</field></block></value>
            <value name="B"><block type="robot_line"><field name="INDEX">1</field></block></value>
          </block>
        </value>
        <value name="B"><block type="robot_line"><field name="INDEX">2</field></block></value>
      </block>
    </value>
    <next>
      <block type="variables_set">
        <field name="VAR" id="vright">right</field>
        <value name="VALUE">
          <block type="math_arithmetic">
            <field name="OP">ADD</field>
            <value name="A">
              <block type="math_arithmetic">
                <field name="OP">ADD</field>
                <value name="A"><block type="robot_line"><field name="INDEX">3</field></block></value>
                <value name="B"><block type="robot_line"><field name="INDEX">4</field></block></value>
              </block>
            </value>
            <value name="B"><block type="robot_line"><field name="INDEX">5</field></block></value>
          </block>
        </value>
        <next>
          <block type="variables_set">
            <field name="VAR" id="vturn">turn</field>
            <value name="VALUE">
              <block type="math_arithmetic">
                <field name="OP">MULTIPLY</field>
                <value name="A">
                  <block type="math_arithmetic">
                    <field name="OP">MINUS</field>
                    <value name="A"><block type="variables_get"><field name="VAR" id="vright">right</field></block></value>
                    <value name="B"><block type="variables_get"><field name="VAR" id="vleft">left</field></block></value>
                  </block>
                </value>
                <value name="B"><block type="math_number"><field name="NUM">0.25</field></block></value>
              </block>
            </value>
            <next>
              <block type="variables_set">
                <field name="VAR" id="vspeed">speed</field>
                <value name="VALUE"><block type="math_number"><field name="NUM">1</field></block></value>
                <next>
                  <block type="controls_if">
                    <value name="IF0">
                      <block type="logic_operation">
                        <field name="OP">OR</field>
                        <value name="A">
                          <block type="logic_compare">
                            <field name="OP">EQ</field>
                            <value name="A"><block type="robot_line"><field name="INDEX">0</field></block></value>
                            <value name="B"><block type="math_number"><field name="NUM">1</field></block></value>
                          </block>
                        </value>
                        <value name="B">
                          <block type="logic_compare">
                            <field name="OP">EQ</field>
                            <value name="A"><block type="robot_line"><field name="INDEX">5</field></block></value>
                            <value name="B"><block type="math_number"><field name="NUM">1</field></block></value>
                          </block>
                        </value>
                      </block>
                    </value>
                    <statement name="DO0">
                      <block type="variables_set">
                        <field name="VAR" id="vspeed">speed</field>
                        <value name="VALUE"><block type="math_number"><field name="NUM">0.4</field></block></value>
                      </block>
                    </statement>
                    <next>
                      <block type="controls_if">
                        <value name="IF0">
                          <block type="logic_compare">
                            <field name="OP">EQ</field>
                            <value name="A">
                              <block type="math_arithmetic">
                                <field name="OP">ADD</field>
                                <value name="A"><block type="variables_get"><field name="VAR" id="vleft">left</field></block></value>
                                <value name="B"><block type="variables_get"><field name="VAR" id="vright">right</field></block></value>
                              </block>
                            </value>
                            <value name="B"><block type="math_number"><field name="NUM">0</field></block></value>
                          </block>
                        </value>
                        <statement name="DO0">
                          <block type="variables_set">
                            <field name="VAR" id="vspeed">speed</field>
                            <value name="VALUE"><block type="math_number"><field name="NUM">0</field></block></value>
                            <next>
                              <block type="variables_set">
                                <field name="VAR" id="vturn">turn</field>
                                <value name="VALUE"><block type="math_number"><field name="NUM">0.4</field></block></value>
                              </block>
                            </next>
                          </block>
                        </statement>
                        <next>
                          <block type="robot_drive">
                            <value name="SPEED"><block type="variables_get"><field name="VAR" id="vspeed">speed</field></block></value>
                            <value name="TURN"><block type="variables_get"><field name="VAR" id="vturn">turn</field></block></value>
                          </block>
                        </next>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </next>
      </block>
    </next>
  </block>
</xml>`;
