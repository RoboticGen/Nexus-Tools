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
const LINE_VARIABLES = `
  <variables>
    <variable id="vleft">left</variable>
    <variable id="vright">right</variable>
    <variable id="vturn">turn</variable>
    <variable id="vspeed">speed</variable>
  </variables>`;

const LINE_FOLLOW = `
<block type="variables_set">
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
  </block>`;

const xml = (variables: string, chain: string) =>
  `<xml xmlns="https://developers.google.com/blockly/xml">${variables}${chain.trim().replace("<block ", '<block x="40" y="40" ')}</xml>`;

export const LINE_EXAMPLE_XML = xml(LINE_VARIABLES, LINE_FOLLOW);

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

// The line follower, but it stops while the front ultrasonic sensor sees a boom across the road.
export const RAILWAY_EXAMPLE_XML = xml(
  LINE_VARIABLES,
  `<block type="controls_if">
    <mutation else="1"></mutation>
    <value name="IF0">
      <block type="logic_compare"><field name="OP">LT</field><value name="A">${sensor("front")}</value><value name="B">${n(12)}</value></block>
    </value>
    <statement name="DO0"><block type="robot_stop"></block></statement>
    <statement name="ELSE">${LINE_FOLLOW}</statement>
  </block>`,
);

const line = (i: number) => `<block type="robot_line"><field name="INDEX">${i}</field></block>`;
const get = (v: string) => `<block type="variables_get"><field name="VAR" id="v${v}">${v}</field></block>`;
const set = (v: string, value: string) =>
  `<block type="variables_set"><field name="VAR" id="v${v}">${v}</field><value name="VALUE">${value}</value></block>`;
// Statement blocks run one after another: each next one hangs off the previous block's closing tag.
const chain = (...blocks: string[]): string =>
  blocks.reduceRight((rest, block) => (rest ? block.replace(/<\/block>$/, `<next>${rest}</next></block>`) : block), "");
const cmp = (op: string, a: string, b: string) =>
  `<block type="logic_compare"><field name="OP">${op}</field><value name="A">${a}</value><value name="B">${b}</value></block>`;
const logic = (op: "AND" | "OR", a: string, b: string) =>
  `<block type="logic_operation"><field name="OP">${op}</field><value name="A">${a}</value><value name="B">${b}</value></block>`;
const math = (op: string, a: string, b: string) =>
  `<block type="math_arithmetic"><field name="OP">${op}</field><value name="A">${a}</value><value name="B">${b}</value></block>`;
// if / else if … / else; each branch is a statement chain.
const ifs = (cases: [string, string][], otherwise?: string) =>
  `<block type="controls_if"><mutation elseif="${cases.length - 1}" else="${otherwise ? 1 : 0}"></mutation>${cases
    .map(([cond, then], i) => `<value name="IF${i}">${cond}</value><statement name="DO${i}">${then}</statement>`)
    .join("")}${otherwise ? `<statement name="ELSE">${otherwise}</statement>` : ""}</block>`;
const time = `<block type="robot_time"></block>`;
const sinceT = math("MINUS", time, get("t"));
const sees = (i: number) => cmp("EQ", line(i), n(1));
const middle = math("ADD", line(2), line(3));

// Right-hand rule on tape. The IR bar sits 8 cm ahead of the wheels, so at a junction or the end of
// a line the car notes which side branches it saw, drives on until its wheels are over the junction,
// then takes right, else straight, else left, else turns back, spinning until its middle sensors find
// the new line. Variables keep their values from one tick to the next.
export const LINE_MAZE_EXAMPLE_XML = xml(
  `<variables>${["mode", "t", "sawLeft", "sawRight", "turn"].map((v) => `<variable id="v${v}">${v}</variable>`).join("")}</variables>`,
  ifs(
    [
      [
        cmp("EQ", get("mode"), n(1)),
        chain(
          set("sawLeft", logic("OR", get("sawLeft"), sees(0))),
          set("sawRight", logic("OR", get("sawRight"), sees(5))),
          drive(n(0.3), n(0)),
          ifs([
            [
              cmp("GT", sinceT, n(0.25)),
              chain(
                set("mode", n(2)),
                set("t", time),
                ifs(
                  [
                    [get("sawRight"), set("turn", n(0.4))],
                    [cmp("GT", middle, n(0)), set("mode", n(0))],
                    [get("sawLeft"), set("turn", n(-0.4))],
                  ],
                  set("turn", n(0.4)),
                ),
              ),
            ],
          ]),
        ),
      ],
      [
        cmp("EQ", get("mode"), n(2)),
        chain(
          drive(n(0), get("turn")),
          ifs([[logic("AND", cmp("GT", sinceT, n(0.25)), cmp("GT", middle, n(0))), set("mode", n(0))]]),
        ),
      ],
    ],
    ifs(
      [
        [
          logic(
            "OR",
            logic("OR", logic("AND", sees(0), sees(2)), logic("AND", sees(5), sees(3))),
            cmp("EQ", math("ADD", math("ADD", line(1), line(2)), math("ADD", line(3), line(4))), n(0)),
          ),
          chain(set("mode", n(1)), set("t", time), set("sawLeft", sees(0)), set("sawRight", sees(5))),
        ],
      ],
      drive(n(0.5), math("MULTIPLY", math("MINUS", math("ADD", line(3), line(4)), math("ADD", line(1), line(2))), n(0.15))),
    ),
  ),
);

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
    id: "railway",
    title: "Railway crossing",
    track: "railway",
    summary: "Follow the line, and wait while the ultrasonic sensor sees the gate down.",
    xml: RAILWAY_EXAMPLE_XML,
  },
  {
    id: "line-maze",
    title: "Line maze solver",
    track: "lineMaze",
    summary: "Drive to each junction, then take the right-most way to find the green goal.",
    xml: LINE_MAZE_EXAMPLE_XML,
  },
  {
    id: "maze",
    title: "Maze solver",
    track: "maze",
    summary: "Keep a hand on the right wall to reach the centre of the maze.",
    xml: MAZE_EXAMPLE_XML,
  },
] as const;
