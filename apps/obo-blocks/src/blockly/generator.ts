/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Order } from "blockly/python";

export const forBlock = Object.create(null);

forBlock["math_change"] = function (block: any, generator: any) {
  generator.definitions_["from_numbers_import_Number"] =
    "from numbers import Number";
  const argument0 =
    generator.valueToCode(block, "DELTA", Order.ADDITIVE) || "0";
  const varName = generator.getVariableName(block.getFieldValue("VAR"));
  return (
    varName +
    " = (" +
    varName +
    " if isinstance(" +
    varName +
    ", Number) else 0) + " +
    argument0 +
    "\n"
  );
};

forBlock["math_number"] = function (block: any, _generator: any) {
  const number = Number(block.getFieldValue("NUM"));
  if (number === Infinity) {
    return ['float("inf")', Order.FUNCTION_CALL];
  } else if (number === -Infinity) {
    return ['-float("inf")', Order.UNARY_SIGN];
  } else {
    return [String(number), number < 0 ? Order.UNARY_SIGN : Order.ATOMIC];
  }
};

forBlock["print_block"] = function (block: any, generator: any) {
  const value_value = generator.valueToCode(block, "value", Order.ATOMIC);
  const code = "print(" + value_value + ")\n";
  return code;
};

forBlock["string_block"] = function (block: any, _generator: any) {
  const text_input = block.getFieldValue("input");
  const code = '"' + text_input + '"';
  return [code, Order.ATOMIC];
};

forBlock["add_block"] = function (block: any, generator: any) {
  const value_left = generator.valueToCode(block, "left", Order.ATOMIC);
  const value_right = generator.valueToCode(block, "right", Order.ATOMIC);
  const code = value_left + " + " + value_right;
  return [code, Order.ATOMIC];
};

forBlock["subtract_block"] = function (block: any, generator: any) {
  const value_left = generator.valueToCode(block, "left", Order.ATOMIC);
  const value_right = generator.valueToCode(block, "right", Order.ATOMIC);
  const code = value_left + " - " + value_right;
  return [code, Order.ATOMIC];
};

forBlock["if_block"] = function (block: any, generator: any) {
  const value_condition = generator.valueToCode(block, "condition", Order.ATOMIC);
  const statements_statement = generator.statementToCode(block, "statement");
  const code = "if " + value_condition + ":\n" + statements_statement;
  return code;
};

forBlock["number_block"] = function (block: any, _generator: any) {
  const number_input = block.getFieldValue("input");
  const code = number_input;
  return [code, Order.ATOMIC];
};

forBlock["equal_block"] = function (block: any, generator: any) {
  const value_left = generator.valueToCode(block, "left", Order.ATOMIC);
  const value_right = generator.valueToCode(block, "right", Order.ATOMIC);
  const code = value_left + " == " + value_right;
  return [code, Order.ATOMIC];
};

forBlock["if_else_block"] = function (block: any, generator: any) {
  const value_condition = generator.valueToCode(block, "condition", Order.ATOMIC);
  const statements_statement = generator.statementToCode(block, "statement");
  const statements_else = generator.statementToCode(block, "else");
  const code =
    "if " +
    value_condition +
    ":\n" +
    statements_statement +
    "\n" +
    "else : \n" +
    statements_else;
  return code;
};

forBlock["multiply_block"] = function (block: any, generator: any) {
  const value_left = generator.valueToCode(block, "left", Order.ATOMIC);
  const value_right = generator.valueToCode(block, "right", Order.ATOMIC);
  const code = value_left + " * " + value_right;
  return [code, Order.ATOMIC];
};

forBlock["division_block"] = function (block: any, generator: any) {
  const value_left = generator.valueToCode(block, "left", Order.ATOMIC);
  const value_right = generator.valueToCode(block, "right", Order.ATOMIC);
  const code = value_left + " / " + value_right;
  return [code, Order.ATOMIC];
};

forBlock["not_equal_block"] = function (block: any, generator: any) {
  const value_left = generator.valueToCode(block, "left", Order.ATOMIC);
  const value_right = generator.valueToCode(block, "right", Order.ATOMIC);
  const code = value_left + " != " + value_right;
  return [code, Order.ATOMIC];
};

forBlock["while_block"] = function (block: any, generator: any) {
  const value_condition = generator.valueToCode(block, "condition", Order.ATOMIC);
  const statements_statement = generator.statementToCode(block, "statement");
  const code = "while " + value_condition + ":\n" + statements_statement;
  return code;
};

forBlock["greater_than_block"] = function (block: any, generator: any) {
  const value_left = generator.valueToCode(block, "left", Order.ATOMIC);
  const value_right = generator.valueToCode(block, "right", Order.ATOMIC);
  const code = value_left + " > " + value_right;
  return [code, Order.ATOMIC];
};

forBlock["less_than_block"] = function (block: any, generator: any) {
  const value_left = generator.valueToCode(block, "left", Order.ATOMIC);
  const value_right = generator.valueToCode(block, "right", Order.ATOMIC);
  const code = value_left + " < " + value_right;
  return [code, Order.ATOMIC];
};

forBlock["greater_than_equal_block"] = function (block: any, generator: any) {
  const value_left = generator.valueToCode(block, "left", Order.ATOMIC);
  const value_right = generator.valueToCode(block, "right", Order.ATOMIC);
  const code = value_left + " >= " + value_right;
  return [code, Order.ATOMIC];
};

forBlock["less_than_equal_block"] = function (block: any, generator: any) {
  const value_left = generator.valueToCode(block, "left", Order.ATOMIC);
  const value_right = generator.valueToCode(block, "right", Order.ATOMIC);
  const code = value_left + " <= " + value_right;
  return [code, Order.ATOMIC];
};

forBlock["input_block"] = function (block: any, _generator: any) {
  const text_input = block.getFieldValue("input");
  const code = 'input("' + text_input + '")\n';
  return [code, Order.ATOMIC];
};

forBlock["true_block"] = function (_block: any, _generator: any) {
  const code = "True";
  return [code, Order.ATOMIC];
};

forBlock["false_block"] = function (_block: any, _generator: any) {
  const code = "False";
  return [code, Order.ATOMIC];
};

forBlock["modulo_block"] = function (block: any, generator: any) {
  const value_left = generator.valueToCode(block, "left", Order.ATOMIC);
  const value_right = generator.valueToCode(block, "right", Order.ATOMIC);
  const code = value_left + " % " + value_right;
  return [code, Order.MULTIPLICATIVE];
};

forBlock["power_block"] = function (block: any, generator: any) {
  const value_left = generator.valueToCode(block, "left", Order.ATOMIC);
  const value_right = generator.valueToCode(block, "right", Order.ATOMIC);
  const code = value_left + " ^ " + value_right;
  return [code, Order.ATOMIC];
};

forBlock["range_block"] = function (block: any, generator: any) {
  const value_start = generator.valueToCode(block, "start", Order.ATOMIC);
  const value_end = generator.valueToCode(block, "end", Order.ATOMIC);
  const value_step = generator.valueToCode(block, "step", Order.ATOMIC);

  let code = "range(";

  if (value_start != "") {
    code = code + value_start;

    if (value_end != "") {
      code = code + "," + value_end;

      if (value_step != "") {
        code = code + "," + value_step;
      }
    }
  } else if (value_end != "") {
    code = code + value_end;
  }

  code = code + ")";

  return [code, Order.ATOMIC];
};

forBlock["for_block"] = function (block: any, generator: any) {
  const variable_variable = generator.getVariableName(
    block.getFieldValue("variable"),

  );
  const value_value = generator.valueToCode(block, "value", Order.ATOMIC);
  const statements_statement = generator.statementToCode(block, "statement");
  const code =
    "for " +
    variable_variable +
    " in " +
    value_value +
    " :\n" +
    statements_statement;
  return code;
};

forBlock["list_block"] = function (block: any, _generator: any) {
  const text_input = block.getFieldValue("input");
  const code = "[" + text_input + "]";
  return [code, Order.ATOMIC];
};

forBlock["list_append_block"] = function (block: any, generator: any) {
  const value_value = generator.valueToCode(block, "value", Order.ATOMIC);
  const value_list = generator.valueToCode(block, "list", Order.ATOMIC);
  const code = value_list + ".append(" + value_value + ")\n";
  return code;
};

forBlock["list_remove_block"] = function (block: any, generator: any) {
  const value_value = generator.valueToCode(block, "value", Order.ATOMIC);
  const value_list = generator.valueToCode(block, "list", Order.ATOMIC);
  const code = value_list + ".remove(" + value_value + ")\n";
  return code;
};

forBlock["list_index_get_block"] = function (block: any, generator: any) {
  const number_index = block.getFieldValue("index");
  const value_input = generator.valueToCode(block, "input", Order.ATOMIC);
  const code = value_input + "[" + number_index + "]";
  return [code, Order.ATOMIC];
};

forBlock["list_index_set_block"] = function (block: any, generator: any) {
  const number_index = block.getFieldValue("index");
  const value_input = generator.valueToCode(block, "input", Order.ATOMIC);
  const text_value = block.getFieldValue("value");
  const code = value_input + "[" + number_index + "] = " + text_value + "\n";
  return code;
};

forBlock["int_str_conv_block"] = function (block: any, _generator: any) {
  const value_input = block.getFieldValue("number");
  const code = "str(" + value_input + ")";
  return [code, Order.ATOMIC];
};

forBlock["time_sleep"] = function (block: any, generator: any) {
  if (!generator.definitions_["import_time"]) {
    generator.definitions_["import_time"] = "import time";
  }
  const number_time = block.getFieldValue("time");
  const code = "time.sleep(" + number_time + ")\n";
  return code;
};

forBlock["variables_get"] = function (block: any, generator: any) {
  const code = generator.getVariableName(block.getFieldValue("VAR"));
  return [code, Order.ATOMIC];
};

forBlock["variables_set"] = function (block: any, generator: any) {
  const argument0 = generator.valueToCode(block, "VALUE", Order.NONE) || "0";
  const varName = generator.getVariableName(block.getFieldValue("VAR"));
  return varName + " = " + argument0 + "\n";
};

forBlock["pin_state"] = function (block: any, generator: any) {
  if (!generator.definitions_["import_machine"]) {
    generator.definitions_["import_machine"] = "import machine";
  }
  const variable_pin_variable = generator.getVariableName(
    block.getFieldValue("pin_variable"),

  );
  const dropdown_pin_states = block.getFieldValue("pin_states");
  const code = `${variable_pin_variable}.${dropdown_pin_states}()\n`;
  return code;
};

forBlock["pin_mode"] = function (block: any, generator: any) {
  if (!generator.definitions_["import_machine"]) {
    generator.definitions_["import_machine"] = "import machine";
  }

  const number_pin_number = block.getFieldValue("pin_number");
  const variable_pinvariable = generator.getVariableName(
    block.getFieldValue("pinVariable"),

  );
  const dropdown_pinmode = block.getFieldValue("pinMode");

  const code = `${variable_pinvariable} = machine.Pin(${number_pin_number},machine.Pin.${dropdown_pinmode})\n`;
  return code;
};

forBlock["pin_value"] = function (block: any, generator: any) {
  if (!generator.definitions_["import_machine"]) {
    generator.definitions_["import_machine"] = "import machine";
  }

  const variable_pin_variable = generator.getVariableName(
    block.getFieldValue("pin_variable"),

  );
  const dropdown_pin_values = block.getFieldValue("pin_values");
  const code = `${variable_pin_variable}.value(${dropdown_pin_values})\n`;
  return code;
};

forBlock["create_adc"] = function (block: any, generator: any) {
  if (!generator.definitions_["import_machine"]) {
    generator.definitions_["import_machine"] = "import machine";
  }
  const variable_pin_variable = generator.getVariableName(
    block.getFieldValue("pin_variable"),

  );
  const variable_adc_variable = generator.getVariableName(
    block.getFieldValue("adc_variable"),

  );
  const code = `${variable_adc_variable} = machine.ADC(${variable_pin_variable})\n`;
  return code;
};

forBlock["read_adc"] = function (block: any, generator: any) {
  if (!generator.definitions_["import_machine"]) {
    generator.definitions_["import_machine"] = "import machine";
  }
  const variable_adc_variable = generator.getVariableName(
    block.getFieldValue("adc_variable"),

  );
  const value_adc_value = generator.valueToCode(block, "adc_value", Order.ATOMIC);
  const code = `${value_adc_value} = ${variable_adc_variable}.read_u16()\n`;
  return code;
};

forBlock["read_micro_volt"] = function (block: any, generator: any) {
  if (!generator.definitions_["import_machine"]) {
    generator.definitions_["import_machine"] = "import machine";
  }
  const variable_adc = generator.getVariableName(
    block.getFieldValue("ADC"),

  );
  const variable_var = generator.getVariableName(
    block.getFieldValue("Var"),

  );
  const code = `${variable_var} = ${variable_adc}.read_uv()\n`;
  return code;
};

forBlock["create_pwm"] = function (block: any, generator: any) {
  if (!generator.definitions_["import_machine"]) {
    generator.definitions_["import_machine"] = "import machine";
  }
  const variable_pwm = generator.getVariableName(
    block.getFieldValue("PWM"),

  );
  const variable_pin = generator.getVariableName(
    block.getFieldValue("Pin"),

  );
  const number_frequency = block.getFieldValue("frequency");
  const number_duty = block.getFieldValue("duty");
  const code = `${variable_pwm} = machine.PWM(${variable_pin}, freq=${number_frequency}, duty_u16=${number_duty})\n`;
  return code;
};

forBlock["set_pwm_duty"] = function (block: any, generator: any) {
  if (!generator.definitions_["import_machine"]) {
    generator.definitions_["import_machine"] = "import machine";
  }
  const variable_pwm = generator.getVariableName(
    block.getFieldValue("PWM"),

  );
  const number_duty_cycle = block.getFieldValue("duty_cycle");
  const code = `${variable_pwm}.duty_u16(${number_duty_cycle})\n`;
  return code;
};

forBlock["init_pwm"] = function (block: any, generator: any) {
  if (!generator.definitions_["import_machine"]) {
    generator.definitions_["import_machine"] = "import machine";
  }
  const variable_pwm = generator.getVariableName(
    block.getFieldValue("PWM"),

  );
  const number_frequency = block.getFieldValue("frequency");
  const number_duty = block.getFieldValue("duty");
  const code = `${variable_pwm}.init(freq=${number_frequency},duty_ns=${number_duty})\n`;
  return code;
};

forBlock["deinitilize_pwm"] = function (block: any, generator: any) {
  if (!generator.definitions_["import_machine"]) {
    generator.definitions_["import_machine"] = "import machine";
  }
  const variable_pwm = generator.getVariableName(
    block.getFieldValue("PWM"),

  );
  const code = `${variable_pwm}.deinit()\n`;
  return code;
};

forBlock["set_duty_ns"] = function (block: any, generator: any) {
  if (!generator.definitions_["import_machine"]) {
    generator.definitions_["import_machine"] = "import machine";
  }
  const variable_pwm = generator.getVariableName(
    block.getFieldValue("PWM"),

  );
  const number_duty_ns = block.getFieldValue("duty_ns");
  const code = `${variable_pwm}.duty_ns(${number_duty_ns})\n`;
  return code;
};

forBlock["set_frequency"] = function (block: any, generator: any) {
  if (!generator.definitions_["import_machine"]) {
    generator.definitions_["import_machine"] = "import machine";
  }
  const variable_pwm = generator.getVariableName(
    block.getFieldValue("PWM"),

  );
  const number_frequency = block.getFieldValue("frequency");
  const code = `${variable_pwm}.freq(${number_frequency})\n`;
  return code;
};

forBlock["i2c"] = function (block: any, generator: any) {
  if (!generator.definitions_["import_machine"]) {
    generator.definitions_["import_machine"] = "import machine";
  }
  const variable_sclpin = generator.getVariableName(
    block.getFieldValue("sclPin"),

  );
  const variable_sdapin = generator.getVariableName(
    block.getFieldValue("sdaPin"),

  );
  const number_frequency = block.getFieldValue("frequency");
  const variable_i2c = generator.getVariableName(
    block.getFieldValue("i2c"),

  );
  const code = `${variable_i2c} = machine.I2C(scl=${variable_sclpin},sda=${variable_sdapin},freq=${number_frequency})\n`;
  return code;
};

forBlock["i2c_init"] = function (block: any, generator: any) {
  if (!generator.definitions_["import_machine"]) {
    generator.definitions_["import_machine"] = "import machine";
  }
  const variable_sclpin = generator.getVariableName(
    block.getFieldValue("sclPin"),

  );
  const variable_sdapin = generator.getVariableName(
    block.getFieldValue("sdaPin"),

  );
  const number_frequency = block.getFieldValue("frequency");
  const variable_i2c = generator.getVariableName(
    block.getFieldValue("i2c"),

  );
  const code = `${variable_i2c} = machine.I2C(scl=${variable_sclpin},sda=${variable_sdapin},freq=${number_frequency})\n`;
  return code;
};

forBlock["deint_i2c"] = function (block: any, generator: any) {
  if (!generator.definitions_["import_machine"]) {
    generator.definitions_["import_machine"] = "import machine";
  }
  const variable_i2c = generator.getVariableName(
    block.getFieldValue("i2c"),

  );
  const code = `${variable_i2c}.deint()\n`;
  return code;
};

forBlock["i2c_scan"] = function (block: any, generator: any) {
  if (!generator.definitions_["import_machine"]) {
    generator.definitions_["import_machine"] = "import machine";
  }
  const variable_i2c = generator.getVariableName(
    block.getFieldValue("I2C"),

  );
  const code = `${variable_i2c}.scan()\n`;
  return code;
};
