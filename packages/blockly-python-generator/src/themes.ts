import { BRAND, BRAND_DEEP, TONE } from "@nexus-tools/design-system/lib/palette";
import * as Blockly from "blockly";

// Literal hex, not `var(--brand-teal)`: Blockly derives gradients and borders in JS at inject time, where a CSS variable resolves to empty and blocks render black. Deep variants rather than the bright brand hues because Blockly's BlockStyle has no text-colour field — block labels come from one global white rule, so every block colour must clear 4.5:1 against white.
const categoryStyles = {
  Input_Output_category: {
    colour: BRAND_DEEP.sky,
  },
  list_operations_category: {
    colour: BRAND_DEEP.violet,
  },
  control_category: {
    colour: BRAND_DEEP.gold,
  },
  operators_category: {
    colour: BRAND_DEEP.green,
  },
  variable_category: {
    colour: BRAND_DEEP.coral,
  },
  procedure_category: {
    colour: TONE.danger,
  },
  time_category: {
    colour: BRAND_DEEP.teal,
  },
  pin_category: {
    colour: BRAND.navy,
  },
  adc_category: {
    colour: TONE.dangerDeep,
  },
  pwm_category: {
    colour: BRAND.ink,
  },
  i2c_category: {
    colour: BRAND_DEEP.grey,
  },

  // The only category with no blocks of its own, so it can use a bright hue; OboCategory gives the chip the matching `-on` label.
  micropython_category: {
    colour: BRAND.sky,
  },
};

// Built-in blocks (variables, functions, loops, logic, maths, text, lists) ignore categoryStyles and read these by name; each takes its own category's colour so a block matches the chip it came from.
const blockStyles = {
  variable_blocks: {
    colourPrimary: BRAND_DEEP.coral,
  },
  variable_dynamic_blocks: {
    colourPrimary: BRAND_DEEP.coral,
  },
  procedure_blocks: {
    colourPrimary: TONE.danger,
  },
  logic_blocks: {
    colourPrimary: BRAND_DEEP.sky,
  },
  loop_blocks: {
    colourPrimary: BRAND_DEEP.gold,
  },
  math_blocks: {
    colourPrimary: BRAND_DEEP.green,
  },
  text_blocks: {
    colourPrimary: BRAND_DEEP.green,
  },
  list_blocks: {
    colourPrimary: BRAND_DEEP.violet,
  },
  colour_blocks: {
    colourPrimary: BRAND_DEEP.grey,
  },
  hat_blocks: {
    colourPrimary: BRAND.navy,
  },
};

export const theme = Blockly.Theme.defineTheme("mytheme", {
  name: "mytheme",
  base: Blockly.Themes.Classic,
  categoryStyles: categoryStyles,
  blockStyles: blockStyles,
});
