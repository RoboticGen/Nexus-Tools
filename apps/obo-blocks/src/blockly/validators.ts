export const defaultVariableValidator = function (this: any, variable_id: string) {
  let variable = this.getSourceBlock()
    .workspace.getVariableMap()
    .getVariableById(variable_id);
  if (variable.type != "") return null;
};

export const pinModeBlockValidator = function (this: any, _event?: any) {
  if (this.workspace.getBlocksByType("pin_mode").length === 0)
    this.setWarningText("You should initialize Pin first");
  else this.setWarningText();
};

export const adcBlockValidator = function (this: any, _event?: any) {
  if (this.workspace.getBlocksByType("create_adc").length === 0)
    this.setWarningText("You should initialize create ADC first");
  else this.setWarningText();
};

export const pwmBlockValidator = function (this: any, _event?: any) {
  if (this.workspace.getBlocksByType("create_pwm").length === 0)
    this.setWarningText("You should initialize create PWM first");
  else this.setWarningText();
};

export const i2cPinBlockValidator = function (this: any, _event?: any) {
  if (this.workspace.getBlocksByType("pin_mode").length < 2)
    this.setWarningText("You should initialize create two pins first");
  else this.setWarningText();
};

export const i2cBlockValidator = function (this: any, _event?: any) {
  if (
    this.workspace.getBlocksByType("i2c_init").length === 0 &&
    this.workspace.getBlocksByType("i2c").length === 0
  )
    this.setWarningText("You should initialize create i2c first");
  else this.setWarningText();
};
