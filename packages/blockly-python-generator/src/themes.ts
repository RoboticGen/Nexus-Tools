import * as Blockly from "blockly";

/*
  No `css-icon` on any category, deliberately.

  Six of the twelve below used to carry `"css-icon": "fa fa-file"` — the same
  generic "file" glyph on Input/Output, Lists, Operators, Control, Variables and
  Procedures, and nothing on the other six. So the toolbox was already
  inconsistent, and those six classes were the only thing requiring consumers to
  load the Font Awesome CDN. obo-blocks pulled in the whole icon font for them.

  Dropping them makes all twelve categories label-only, which is both consistent
  and one less render-blocking third-party request. Add icons back per-category
  if they ever become distinct enough to mean something.
*/
const categoryStyles = {
  Input_Output_category: {
    colour: "#4C97FF",
  },
  list_operations_category: {
    colour: "#CF63CF",
  },
  operators_category: {
    colour: "#59C059",
  },
  control_category: {
    colour: "#FFBF00",
  },
  variable_category: {
    colour: "#FF8C1A",
  },
  procedure_category: {
    colour: "#FF6680",
  },
  time_category: {
    colour: "#8c52ff",
  },
  micropython_category: {
    colour: "#00ae7b",
  },
  pin_category: {
    colour: "#005d8f",
  },
  adc_category: {
    colour: "#ff4300",
  },
  pwm_category: {
    colour: "#6e9d2f",
  },
  i2c_category: {
    colour: "#797c7d",
  },
};

export const theme = Blockly.Theme.defineTheme("mytheme", {
  name: "mytheme",
  base: Blockly.Themes.Classic,
  categoryStyles: categoryStyles,
});
