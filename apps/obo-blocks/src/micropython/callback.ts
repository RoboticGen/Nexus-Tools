import * as Blockly from "blockly/core";

export const createPinButtonCallback = (button: Blockly.FlyoutButton) => {
  const workspace = button.getTargetWorkspace();
  if (workspace) {
    const variable_name = prompt("Name of the Pin variable ?");
    if (variable_name == null) {
      return;
    }
    const variable = workspace.getVariable(variable_name, "Pin");
    if (variable != null) {
      alert("Variable " + variable_name + " already exists!");
      return;
    }
    workspace.createVariable(variable_name, "Pin");
  }
};

export const createADCButtonCallback = (button: Blockly.FlyoutButton) => {
  const workspace = button.getTargetWorkspace();
  if (workspace) {
    const variable_name = prompt("Name of the ADC variable ?");
    if (variable_name == null) {
      return;
    }
    const variable = workspace.getVariable(variable_name, "ADC");
    if (variable != null) {
      alert("Variable " + variable_name + " already exists!");
      return;
    }
    workspace.createVariable(variable_name, "ADC");
  }
};

export const createPWMButtonCallback = (button: Blockly.FlyoutButton) => {
  const workspace = button.getTargetWorkspace();
  if (workspace) {
    const variable_name = prompt("Name of the PWM variable ?");
    if (variable_name == null) {
      return;
    }
    const variable = workspace.getVariable(variable_name, "PWM");
    if (variable != null) {
      alert("Variable " + variable_name + " already exists!");
      return;
    }
    workspace.createVariable(variable_name, "PWM");
  }
};

export const createI2CButtonCallback = (button: Blockly.FlyoutButton) => {
  const workspace = button.getTargetWorkspace();
  if (workspace) {
    const variable_name = prompt("Name of the I2C variable ?");
    if (variable_name == null) {
      return;
    }
    const variable = workspace.getVariable(variable_name, "I2C");
    if (variable != null) {
      alert("Variable " + variable_name + " already exists!");
      return;
    }
    workspace.createVariable(variable_name, "I2C");
  }
};
