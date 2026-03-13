/**
 * MicroPython ESP32 - Main Export
 * MicroPython code generation and hardware block support for ESP32
 */

// MicroPython generator (extends Blockly Python generator)
export { pythonGenerator } from './setup';

// Hardware variable callbacks
export {
  createPinButtonCallback,
  createADCButtonCallback,
  createPWMButtonCallback,
  createI2CButtonCallback,
} from './callback';

// Dynamic flyout generation for hardware categories
export {
  pinCategoryFlyout,
  adcCategoryFlyout,
  pwmCategoryFlyout,
  i2cCategoryFlyout,
} from './flyouts';
