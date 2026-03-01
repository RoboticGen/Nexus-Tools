/**
 * JSON definitions for all custom blocks
 * Required for Blockly serialization to work properly
 */

export const blockJsonDefinitions = {
  string_block: {
    type: "string_block",
    message0: "%1",
    args0: [
      {
        type: "field_input",
        name: "input",
        text: "Hello World!",
      },
    ],
    output: null,
    colour: "#59C059",
    tooltip: "",
    helpUrl: "",
  },
  add_block: {
    type: "add_block",
    message0: "%1 + %2",
    args0: [
      {
        type: "input_value",
        name: "left",
      },
      {
        type: "input_value",
        name: "right",
      },
    ],
    output: null,
    colour: "#59C059",
    tooltip: "",
    helpUrl: "",
  },
  subtract_block: {
    type: "subtract_block",
    message0: "%1 - %2",
    args0: [
      {
        type: "input_value",
        name: "left",
      },
      {
        type: "input_value",
        name: "right",
      },
    ],
    output: null,
    colour: "#59C059",
    tooltip: "",
    helpUrl: "",
  },
  print_block: {
    type: "print_block",
    message0: "print %1",
    args0: [
      {
        type: "input_value",
        name: "value",
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#4C97FF",
    tooltip: "",
    helpUrl: "",
  },
  if_block: {
    type: "if_block",
    message0: "if %1 then %2",
    args0: [
      {
        type: "input_value",
        name: "condition",
        check: "Boolean",
      },
      {
        type: "input_statement",
        name: "statement",
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#FFBF00",
    tooltip: "",
    helpUrl: "",
  },
  number_block: {
    type: "number_block",
    message0: "%1",
    args0: [
      {
        type: "field_number",
        name: "input",
        value: 0,
      },
    ],
    output: "Number",
    colour: "#59C059",
    tooltip: "",
    helpUrl: "",
  },
  equal_block: {
    type: "equal_block",
    message0: "%1 == %2",
    args0: [
      {
        type: "input_value",
        name: "left",
      },
      {
        type: "input_value",
        name: "right",
      },
    ],
    output: "Boolean",
    colour: "#59C059",
    tooltip: "",
    helpUrl: "",
  },
  if_else_block: {
    type: "if_else_block",
    message0: "if %1 then %2 else %3",
    args0: [
      {
        type: "input_value",
        name: "condition",
        check: "Boolean",
      },
      {
        type: "input_statement",
        name: "statement",
      },
      {
        type: "input_statement",
        name: "else",
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#FFAB19",
    tooltip: "",
    helpUrl: "",
  },
  multiply_block: {
    type: "multiply_block",
    message0: "%1 × %2",
    args0: [
      {
        type: "input_value",
        name: "left",
        check: "Number",
      },
      {
        type: "input_value",
        name: "right",
        check: "Number",
      },
    ],
    output: null,
    colour: "#59C059",
    tooltip: "",
    helpUrl: "",
  },
  division_block: {
    type: "division_block",
    message0: "%1 ÷ %2",
    args0: [
      {
        type: "input_value",
        name: "left",
      },
      {
        type: "input_value",
        name: "right",
      },
    ],
    output: null,
    colour: "#59C059",
    tooltip: "",
    helpUrl: "",
  },
  not_equal_block: {
    type: "not_equal_block",
    message0: "%1 != %2",
    args0: [
      {
        type: "input_value",
        name: "left",
      },
      {
        type: "input_value",
        name: "right",
      },
    ],
    output: "Boolean",
    colour: "#59C059",
    tooltip: "",
    helpUrl: "",
  },
  while_block: {
    type: "while_block",
    message0: "while %1 do %2",
    args0: [
      {
        type: "input_value",
        name: "condition",
        check: "Boolean",
      },
      {
        type: "input_statement",
        name: "statement",
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#FF6B6B",
    tooltip: "",
    helpUrl: "",
  },
  list_block: {
    type: "list_block",
    message0: "create list with %1",
    args0: [
      {
        type: "input_value",
        name: "value",
      },
    ],
    output: null,
    colour: "#FF8C00",
    tooltip: "",
    helpUrl: "",
  },
  list_append_block: {
    type: "list_append_block",
    message0: "append %1 to %2",
    args0: [
      {
        type: "input_value",
        name: "value",
      },
      {
        type: "input_value",
        name: "list",
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#FF8C00",
    tooltip: "",
    helpUrl: "",
  },
  list_remove_block: {
    type: "list_remove_block",
    message0: "remove from %1 at %2",
    args0: [
      {
        type: "input_value",
        name: "list",
      },
      {
        type: "input_value",
        name: "index",
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#FF8C00",
    tooltip: "",
    helpUrl: "",
  },
  list_index_get_block: {
    type: "list_index_get_block",
    message0: "get from %1 at %2",
    args0: [
      {
        type: "input_value",
        name: "list",
      },
      {
        type: "input_value",
        name: "index",
      },
    ],
    output: null,
    colour: "#FF8C00",
    tooltip: "",
    helpUrl: "",
  },
  list_index_set_block: {
    type: "list_index_set_block",
    message0: "set in %1 at %2 to %3",
    args0: [
      {
        type: "input_value",
        name: "list",
      },
      {
        type: "input_value",
        name: "index",
      },
      {
        type: "input_value",
        name: "value",
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#FF8C00",
    tooltip: "",
    helpUrl: "",
  },
};
