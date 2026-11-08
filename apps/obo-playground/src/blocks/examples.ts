// Example programs as Blockly XML, each paired with the world it was written for. Kept free of
// Blockly imports so the server-rendered page (the header's Examples menu) can import it.

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

const sensor = (dir: string) => `<block type="robot_sensor"><field name="DIR">${dir}</field></block>`;
const n = (v: number) => `<block type="math_number"><field name="NUM">${v}</field></block>`;
const drive = (speed: string, turn: string) =>
  `<block type="robot_drive"><value name="SPEED">${speed}</value><value name="TURN">${turn}</value></block>`;

// Right-hand rule: in a maze with one path between any two cells, keeping a hand on the right wall
// reaches every cell, the goal included. Spin left at a wall, take every opening on the right, and
// otherwise hold 9 cm off the right wall (the corridor centre).
export const MAZE_EXAMPLE_XML = `
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="controls_if" x="40" y="40">
    <mutation elseif="1" else="1"></mutation>
    <value name="IF0">
      <block type="logic_compare"><field name="OP">LT</field><value name="A">${sensor("front")}</value><value name="B">${n(8)}</value></block>
    </value>
    <statement name="DO0">${drive(n(0), n(-0.4))}</statement>
    <value name="IF1">
      <block type="logic_compare"><field name="OP">GT</field><value name="A">${sensor("right")}</value><value name="B">${n(22)}</value></block>
    </value>
    <statement name="DO1">${drive(n(0.3), n(0.15))}</statement>
    <statement name="ELSE">${drive(
      n(0.4),
      `<block type="math_arithmetic"><field name="OP">MULTIPLY</field><value name="A"><block type="math_arithmetic"><field name="OP">MINUS</field><value name="A">${sensor("right")}</value><value name="B">${n(9)}</value></block></value><value name="B">${n(0.04)}</value></block>`,
    )}</statement>
  </block>
</xml>`;

/** Each example runs in the world it was written for, as OBO Lab pairs examples with their circuits. */
export const EXAMPLES = [
  {
    id: "wall-oval",
    title: "Wall follower",
    track: "oval",
    summary: "Steer toward the open side and slow down when a wall is close.",
    xml: EXAMPLE_XML,
  },
  {
    id: "wall-clover",
    title: "Wall follower: Clover",
    track: "clover",
    summary: "The same driver takes on four tight bends.",
    xml: EXAMPLE_XML,
  },
  {
    id: "wall-slalom",
    title: "Wall follower: Slalom",
    track: "slalom",
    summary: "The same driver weaves left and right without touching a wall.",
    xml: EXAMPLE_XML,
  },
  {
    id: "line",
    title: "Line follower",
    track: "line",
    summary: "Six IR sensors keep the car on the black line.",
    xml: LINE_EXAMPLE_XML,
  },
  {
    id: "line-figure8",
    title: "Line follower: Figure eight",
    track: "figure8",
    summary: "The same follower drives straight over the crossing.",
    xml: LINE_EXAMPLE_XML,
  },
  {
    id: "maze",
    title: "Maze solver",
    track: "maze",
    summary: "Keep a hand on the right wall to reach the centre of the maze.",
    xml: MAZE_EXAMPLE_XML,
  },
] as const;
