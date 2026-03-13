/**
 * Blockly Python Generator - Main Export
 * Blockly-based visual programming with Python code generation
 */

// Import blocks to register them with Blockly (side effects)
import './blocks';

// Export the blocks object (Blockly.Blocks with our custom blocks)
export { blocks } from './blocks';

// Export key utilities and classes
export { OboCategory } from './categories';
export { theme } from './themes';
export { toolbox } from './toolbox';
export { forBlock } from './generator';
export {
  defaultVariableValidator,
  pinModeBlockValidator,
  adcBlockValidator,
  pwmBlockValidator,
  i2cBlockValidator,
  i2cPinBlockValidator,
} from './validators';
export {
  save,
  exportJson,
  importJson,
  getActiveWorkspace,
} from './serialization';
