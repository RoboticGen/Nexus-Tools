/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from "blockly/core";
import {
  defaultVariableValidator,
  pinModeBlockValidator,
  adcBlockValidator,
  pwmBlockValidator,
  i2cBlockValidator,
  i2cPinBlockValidator,
} from "./validators";

Blockly.Blocks["string_block"] = {
  init: function () {
    (this as any).appendDummyInput().appendField(
      new Blockly.FieldTextInput("Hello World!"),
      "input"
    );
    (this as any).setOutput(true, null);
    (this as any).setColour("#59C059");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["add_block"] = {
  init: function () {
    (this as any).appendValueInput("left").setCheck(null);
    (this as any).appendDummyInput().appendField("+");
    (this as any).appendValueInput("right").setCheck(null);
    (this as any).setOutput(true, null);
    (this as any).setColour("#59C059");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["subtract_block"] = {
  init: function () {
    (this as any).appendValueInput("left").setCheck(null);
    (this as any).appendDummyInput().appendField("-");
    (this as any).appendValueInput("right").setCheck(null);
    (this as any).setOutput(true, null);
    (this as any).setColour("#59C059");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["print_block"] = {
  init: function () {
    (this as any).appendValueInput("value").setCheck(null).appendField("print");
    (this as any).setPreviousStatement(true, null);
    (this as any).setNextStatement(true, null);
    (this as any).setColour("#4C97FF");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["if_block"] = {
  init: function () {
    (this as any).appendValueInput("condition").setCheck("Boolean").appendField("if");
    (this as any).appendStatementInput("statement").setCheck(null).appendField("then");
    (this as any).setPreviousStatement(true, null);
    (this as any).setNextStatement(true, null);
    (this as any).setColour("#FFBF00");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["number_block"] = {
  init: function () {
    (this as any).appendDummyInput().appendField(new Blockly.FieldNumber(0), "input");
    (this as any).setOutput(true, "Number");
    (this as any).setColour("#59C059");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["equal_block"] = {
  init: function () {
    (this as any).appendValueInput("left").setCheck(null);
    (this as any).appendDummyInput().appendField("==");
    (this as any).appendValueInput("right").setCheck(null);
    (this as any).setOutput(true, "Boolean");
    (this as any).setColour("#59C059");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["if_else_block"] = {
  init: function () {
    (this as any).appendValueInput("condition").setCheck("Boolean").appendField("if");
    (this as any).appendStatementInput("statement").setCheck(null).appendField("then");
    (this as any).appendStatementInput("else").setCheck(null).appendField("else");
    (this as any).setPreviousStatement(true, null);
    (this as any).setNextStatement(true, null);
    (this as any).setColour("#FFAB19");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["multiply_block"] = {
  init: function () {
    (this as any).appendValueInput("left").setCheck("Number");
    (this as any).appendDummyInput().appendField("*");
    (this as any).appendValueInput("right").setCheck("Number");
    (this as any).setOutput(true, null);
    (this as any).setColour("#59C059");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["division_block"] = {
  init: function () {
    (this as any).appendValueInput("left").setCheck(null);
    (this as any).appendDummyInput().appendField("/");
    (this as any).appendValueInput("right").setCheck(null);
    (this as any).setOutput(true, null);
    (this as any).setColour("#59C059");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["not_equal_block"] = {
  init: function () {
    (this as any).appendValueInput("left").setCheck(null);
    (this as any).appendDummyInput().appendField("!=");
    (this as any).appendValueInput("right").setCheck(null);
    (this as any).setOutput(true, "Boolean");
    (this as any).setColour("#59C059");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["while_block"] = {
  init: function () {
    (this as any).appendValueInput("condition").setCheck("Boolean").appendField("while");
    (this as any).appendStatementInput("statement").setCheck(null).appendField("do");
    (this as any).setPreviousStatement(true, null);
    (this as any).setNextStatement(true, null);
    (this as any).setColour("#FFBF00");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["greater_than_block"] = {
  init: function () {
    (this as any).appendValueInput("left").setCheck(null);
    (this as any).appendDummyInput().appendField(">");
    (this as any).appendValueInput("right").setCheck(null);
    (this as any).setOutput(true, "Boolean");
    (this as any).setColour("#59C059");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["less_than_block"] = {
  init: function () {
    (this as any).appendValueInput("left").setCheck(null);
    (this as any).appendDummyInput().appendField("<");
    (this as any).appendValueInput("right").setCheck(null);
    (this as any).setOutput(true, "Boolean");
    (this as any).setColour("#59C059");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["greater_than_equal_block"] = {
  init: function () {
    (this as any).appendValueInput("left").setCheck(null);
    (this as any).appendDummyInput().appendField(">=");
    (this as any).appendValueInput("right").setCheck(null);
    (this as any).setOutput(true, "Boolean");
    (this as any).setColour("#59C059");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["less_than_equal_block"] = {
  init: function () {
    (this as any).appendValueInput("left").setCheck(null);
    (this as any).appendDummyInput().appendField("<=");
    (this as any).appendValueInput("right").setCheck(null);
    (this as any).setOutput(true, "Boolean");
    (this as any).setColour("#59C059");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["input_block"] = {
  init: function () {
    (this as any).appendDummyInput()
      .appendField("input")
      .appendField(new Blockly.FieldTextInput("prompt"), "input");
    (this as any).setOutput(true, "String");
    (this as any).setColour("#4C97FF");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["true_block"] = {
  init: function () {
    (this as any).appendDummyInput().appendField("True");
    (this as any).setOutput(true, "Boolean");
    (this as any).setColour("#59C059");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["false_block"] = {
  init: function () {
    (this as any).appendDummyInput().appendField("False");
    (this as any).setOutput(true, "Boolean");
    (this as any).setColour("#59C059");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["modulo_block"] = {
  init: function () {
    (this as any).appendValueInput("left").setCheck("Number");
    (this as any).appendDummyInput().appendField("%");
    (this as any).appendValueInput("right").setCheck("Number");
    (this as any).setOutput(true, null);
    (this as any).setColour("#59C059");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["power_block"] = {
  init: function () {
    (this as any).appendValueInput("left").setCheck("Number");
    (this as any).appendDummyInput().appendField("^");
    (this as any).appendValueInput("right").setCheck("Number");
    (this as any).setOutput(true, null);
    (this as any).setColour("#59C059");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["range_block"] = {
  init: function () {
    (this as any).appendDummyInput().appendField("range");
    (this as any).appendValueInput("start").setCheck(null).appendField("begin");
    (this as any).appendValueInput("end").setCheck(null).appendField("end");
    (this as any).appendValueInput("step").setCheck(null).appendField("step");
    (this as any).setOutput(true, null);
    (this as any).setColour("#59C059");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["for_block"] = {
  init: function () {
    (this as any).appendValueInput("value")
      .setCheck(null)
      .appendField("for")
      .appendField(new Blockly.FieldVariable("index"), "variable")
      .appendField("in");
    (this as any).appendStatementInput("statement").setCheck(null);
    (this as any).setPreviousStatement(true, null);
    (this as any).setNextStatement(true, null);
    (this as any).setColour("#FFBF00");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["list_block"] = {
  init: function () {
    (this as any).appendDummyInput()
      .appendField("list")
      .appendField(new Blockly.FieldTextInput("1,2,3"), "input");
    (this as any).setOutput(true, null);
    (this as any).setColour("#CF63CF");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["list_append_block"] = {
  init: function () {
    (this as any).appendDummyInput().appendField("append");
    (this as any).appendValueInput("value").setCheck(null);
    (this as any).appendDummyInput().appendField("to");
    (this as any).appendValueInput("list").setCheck(null);
    (this as any).setPreviousStatement(true, null);
    (this as any).setNextStatement(true, null);
    (this as any).setColour("#CF63CF");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["list_index_get_block"] = {
  init: function () {
    (this as any).appendValueInput("input")
      .setCheck(null)
      .appendField("get index")
      .appendField(new Blockly.FieldNumber(0, 0, Infinity, 1), "index")
      .appendField("of");
    (this as any).setOutput(true, null);
    (this as any).setColour("#CF63CF");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["list_index_set_block"] = {
  init: function () {
    (this as any).appendValueInput("input")
      .setCheck(null)
      .appendField("set index")
      .appendField(new Blockly.FieldNumber(0, 0, Infinity, 1), "index")
      .appendField("of");
    (this as any).appendDummyInput()
      .appendField("to")
      .appendField(new Blockly.FieldTextInput("1,2,3"), "value");
    (this as any).setPreviousStatement(true, null);
    (this as any).setNextStatement(true, null);
    (this as any).setColour("#CF63CF");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["list_remove_block"] = {
  init: function () {
    (this as any).appendDummyInput().appendField("remove");
    (this as any).appendValueInput("value").setCheck(null);
    (this as any).appendDummyInput().appendField("from");
    (this as any).appendValueInput("list").setCheck(null);
    (this as any).setPreviousStatement(true, null);
    (this as any).setNextStatement(true, null);
    (this as any).setColour("#CF63CF");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["int_str_conv_block"] = {
  init: function () {
    (this as any).appendDummyInput()
      .appendField("str")
      .appendField(new Blockly.FieldNumber(0, 0, Infinity, 1), "number");
    (this as any).setOutput(true, null);
    (this as any).setColour("#59C059");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["time_sleep"] = {
  init: function () {
    (this as any).appendDummyInput()
      .appendField("Sleep")
      .appendField(new Blockly.FieldNumber(0, 0), "time")
      .appendField("Seconds");
    (this as any).setPreviousStatement(true, null);
    (this as any).setNextStatement(true, null);
    (this as any).setColour("#8c52ff");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["pin_state"] = {
  init: function () {
    (this as any).appendDummyInput()
      .appendField("Set")
      .appendField(
        new Blockly.FieldVariable("pin", undefined, ["Pin"], "Pin"),
        "pin_variable"
      )
      .appendField("to")
      .appendField(
        new Blockly.FieldDropdown([
          ["On", "On"],
          ["Off", "Off"],
        ]),
        "pin_states"
      );
    (this as any).setInputsInline(true);
    (this as any).setPreviousStatement(true, null);
    (this as any).setNextStatement(true, null);
    (this as any).setColour("#005d8f");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
    (this as any).setOnChange(pinModeBlockValidator);
  },
};

Blockly.Blocks["pin_mode"] = {
  init: function () {
    (this as any).appendDummyInput()
      .appendField("Set pin")
      .appendField(new Blockly.FieldNumber(0, 0, 30, 1), "pin_number")
      .appendField(" to")
      .appendField(
        new Blockly.FieldVariable("pin", undefined, ["Pin"], "Pin"),
        "pinVariable"
      )
      .appendField("variable as ")
      .appendField(
        new Blockly.FieldDropdown([
          ["Input", "IN"],
          ["Output", "OUT"],
        ]),
        "pinMode"
      );
    (this as any).setPreviousStatement(true, null);
    (this as any).setNextStatement(true, null);
    (this as any).setColour("#005d8f");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["pin_value"] = {
  init: function () {
    (this as any).appendDummyInput()
      .appendField("Set")
      .appendField(
        new Blockly.FieldVariable("pin", undefined, ["Pin"], "Pin"),
        "pin_variable"
      )
      .appendField("value to")
      .appendField(
        new Blockly.FieldDropdown([
          ["0", "0"],
          ["1", "1"],
        ]),
        "pin_values"
      );
    (this as any).setPreviousStatement(true, null);
    (this as any).setNextStatement(true, null);
    (this as any).setColour("#005d8f");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
    (this as any).setOnChange(pinModeBlockValidator);
  },
};

Blockly.Blocks["create_adc"] = {
  init: function () {
    (this as any).appendDummyInput()
      .appendField("Create ADC from")
      .appendField(
        new Blockly.FieldVariable("pin", undefined, ["Pin"], "Pin"),
        "pin_variable"
      )
      .appendField("as")
      .appendField(
        new Blockly.FieldVariable("adc", undefined, ["ADC"], "ADC"),
        "adc_variable"
      );
    (this as any).setPreviousStatement(true, null);
    (this as any).setNextStatement(true, null);
    (this as any).setColour("#ff4300");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
  },
};

Blockly.Blocks["read_adc"] = {
  init: function () {
    (this as any).appendDummyInput()
      .appendField("Read")
      .appendField(
        new Blockly.FieldVariable("adc", undefined, ["ADC"], "ADC"),
        "ADC"
      )
      .appendField("assign variable to")
      .appendField(
        new Blockly.FieldVariable("var", defaultVariableValidator),
        "Var"
      );
    (this as any).setPreviousStatement(true, null);
    (this as any).setNextStatement(true, null);
    (this as any).setColour("#ff4300");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
    (this as any).setOnChange(adcBlockValidator);
  },
};

Blockly.Blocks["read_micro_volt"] = {
  init: function () {
    (this as any).appendDummyInput()
      .appendField("Read micro volts from ")
      .appendField(
        new Blockly.FieldVariable("adc", undefined, ["ADC"], "ADC"),
        "ADC"
      )
      .appendField("and assign to")
      .appendField(
        new Blockly.FieldVariable("var", defaultVariableValidator),
        "Var"
      );
    (this as any).setPreviousStatement(true, null);
    (this as any).setNextStatement(true, null);
    (this as any).setColour("#ff4300");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
    (this as any).setOnChange(adcBlockValidator);
  },
};

Blockly.Blocks["create_pwm"] = {
  init: function () {
    (this as any).appendDummyInput()
      .appendField("Create")
      .appendField(
        new Blockly.FieldVariable("pwm", undefined, ["PWM"], "PWM"),
        "PWM"
      )
      .appendField("from")
      .appendField(
        new Blockly.FieldVariable("pin", undefined, ["Pin"], "Pin"),
        "Pin"
      )
      .appendField("with Frequency")
      .appendField(new Blockly.FieldNumber(50, 0, Infinity, 10), "frequency")
      .appendField("Duty")
      .appendField(new Blockly.FieldNumber(8000, 0, Infinity, 10), "duty");
    (this as any).setPreviousStatement(true, null);
    (this as any).setNextStatement(true, null);
    (this as any).setColour("#6e9d2f");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
    (this as any).setOnChange(pinModeBlockValidator);
  },
};

Blockly.Blocks["set_pwm_duty"] = {
  init: function () {
    (this as any).appendDummyInput()
      .appendField(" Set duty cycle of")
      .appendField(
        new Blockly.FieldVariable("pwm", undefined, ["PWM"], "PWM"),
        "PWM"
      )
      .appendField("to")
      .appendField(new Blockly.FieldNumber(32768, 0), "duty_cycle");
    (this as any).setPreviousStatement(true, null);
    (this as any).setNextStatement(true, null);
    (this as any).setColour("#6e9d2f");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
    (this as any).setOnChange(pwmBlockValidator);
  },
};

Blockly.Blocks["init_pwm"] = {
  init: function () {
    (this as any).appendDummyInput()
      .appendField("Initialize")
      .appendField(
        new Blockly.FieldVariable("pwm", undefined, ["PWM"], "PWM"),
        "PWM"
      )
      .appendField("with Frequency")
      .appendField(new Blockly.FieldNumber(50, 0, Infinity, 10), "frequency")
      .appendField("Duty")
      .appendField(new Blockly.FieldNumber(8000, 0, Infinity, 10), "duty");
    (this as any).setPreviousStatement(true, null);
    (this as any).setNextStatement(true, null);
    (this as any).setColour("#6e9d2f");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
    (this as any).setOnChange(pwmBlockValidator);
  },
};

Blockly.Blocks["deinitilize_pwm"] = {
  init: function () {
    (this as any).appendDummyInput()
      .appendField("Deinitialize")
      .appendField(
        new Blockly.FieldVariable("pwm", undefined, ["PWM"], "PWM"),
        "PWM"
      );
    (this as any).setPreviousStatement(true, null);
    (this as any).setNextStatement(true, null);
    (this as any).setColour("#6e9d2f");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
    (this as any).setOnChange(pwmBlockValidator);
  },
};

Blockly.Blocks["set_duty_ns"] = {
  init: function () {
    (this as any).appendDummyInput()
      .appendField("Set duty of")
      .appendField(
        new Blockly.FieldVariable("pwm", undefined, ["PWM"], "PWM"),
        "PWM"
      )
      .appendField("to")
      .appendField(new Blockly.FieldNumber(5000, 0), "duty_ns")
      .appendField("nanoseconds");
    (this as any).setPreviousStatement(true, null);
    (this as any).setNextStatement(true, null);
    (this as any).setColour("#6e9d2f");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
    (this as any).setOnChange(pwmBlockValidator);
  },
};

Blockly.Blocks["set_frequency"] = {
  init: function () {
    (this as any).appendDummyInput()
      .appendField("Set frequency of")
      .appendField(
        new Blockly.FieldVariable("pwm", undefined, ["PWM"], "PWM"),
        "PWM"
      )
      .appendField("to")
      .appendField(new Blockly.FieldNumber(50, 0), "frequency");
    (this as any).setColour("#6e9d2f");
    (this as any).setPreviousStatement(true, null);
    (this as any).setNextStatement(true, null);
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
    (this as any).setOnChange(pwmBlockValidator);
  },
};

Blockly.Blocks["i2c"] = {
  init: function () {
    (this as any).appendDummyInput()
      .appendField("Create I2C with SCL")
      .appendField(
        new Blockly.FieldVariable("scl_pin", undefined, ["Pin"], "Pin"),
        "sclPin"
      )
      .appendField("SDA")
      .appendField(
        new Blockly.FieldVariable("sda_pin", undefined, ["Pin"], "Pin"),
        "sdaPin"
      )
      .appendField("of frequency")
      .appendField(new Blockly.FieldNumber(400000, 0), "frequency")
      .appendField("assign to")
      .appendField(
        new Blockly.FieldVariable("i2c", undefined, ["I2C"], "I2C"),
        "i2c"
      );
    (this as any).setPreviousStatement(true, null);
    (this as any).setNextStatement(true, null);
    (this as any).setColour("#797c7d");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
    (this as any).setOnChange(i2cPinBlockValidator);
  },
};

Blockly.Blocks["i2c_init"] = {
  init: function () {
    (this as any).appendDummyInput()
      .appendField("I2C init using SCL")
      .appendField(
        new Blockly.FieldVariable("scl_pin", undefined, ["Pin"], "Pin"),
        "sclPin"
      )
      .appendField("SDA")
      .appendField(
        new Blockly.FieldVariable("sda_pin", undefined, ["Pin"], "Pin"),
        "sdaPin"
      )
      .appendField("with frequency")
      .appendField(new Blockly.FieldNumber(400000, 0), "frequency")
      .appendField("assign to")
      .appendField(
        new Blockly.FieldVariable("i2c", undefined, ["I2C"], "I2C"),
        "i2c"
      );
    (this as any).setPreviousStatement(true, null);
    (this as any).setNextStatement(true, null);
    (this as any).setColour("#797c7d");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
    (this as any).setOnChange(i2cPinBlockValidator);
  },
};

Blockly.Blocks["deint_i2c"] = {
  init: function () {
    (this as any).appendDummyInput()
      .appendField("Deinitialize")
      .appendField(
        new Blockly.FieldVariable("i2c", undefined, ["I2C"], "I2C"),
        "i2c"
      );
    (this as any).setPreviousStatement(true, null);
    (this as any).setNextStatement(true, null);
    (this as any).setColour("#797c7d");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
    (this as any).setOnChange(i2cBlockValidator);
  },
};

Blockly.Blocks["i2c_scan"] = {
  init: function () {
    (this as any).appendDummyInput()
      .appendField("Scan for devices using")
      .appendField(
        new Blockly.FieldVariable("i2c", undefined, ["I2C"], "I2C"),
        "I2C"
      );
    (this as any).setPreviousStatement(true, null);
    (this as any).setNextStatement(true, null);
    (this as any).setColour("#797c7d");
    (this as any).setTooltip("");
    (this as any).setHelpUrl("");
    (this as any).setOnChange(i2cBlockValidator);
  },
};

export const blocks = Blockly.Blocks;
