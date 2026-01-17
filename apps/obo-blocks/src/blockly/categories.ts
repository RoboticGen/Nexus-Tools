/**
 * Blockly Categories Configuration
 * Custom category implementations for OBO Blocks
 */

import * as Blockly from "blockly/core";

export class OboCategory extends Blockly.ToolboxCategory {
  colour_: string = "";
  rowDiv_: HTMLDivElement | null = null;
  htmlDiv_: HTMLDivElement | null = null;
  iconDom_: HTMLElement | null = null;

  /**
   * Constructor for a custom category.
   * @override
   */
  constructor(categoryDef: any, toolbox: any, opt_parent: any) {
    super(categoryDef, toolbox, opt_parent);
  }

  /** @override */
  addColourBorder_(colour: string) {
    if (this.rowDiv_) {
      this.rowDiv_.style.backgroundColor = colour;
    }
  }

  /**
   * Sets the category to be selected or unselected.
   * @param isSelected True if the category is selected, false otherwise.
   * @override
   */
  setSelected(isSelected: boolean) {
    // We do not store the label span on the category, so use getElementsByClassName.
    const labelDom = this.rowDiv_?.getElementsByClassName('blocklyTreeLabel')[0] as HTMLElement;
    
    if (isSelected) {
      // Change the background color of the div to white.
      if (this.rowDiv_) {
        this.rowDiv_.style.backgroundColor = 'white';
      }
      // Set the colour of the text to the colour of the category.
      if (labelDom) {
        labelDom.style.color = this.colour_;
      }
      if (this.iconDom_) {
        this.iconDom_.style.color = this.colour_;
      }
    } else {
      // Set the background back to the original colour.
      if (this.rowDiv_) {
        this.rowDiv_.style.backgroundColor = this.colour_;
      }
      // Set the text back to white.
      if (labelDom) {
        labelDom.style.color = 'white';
      }
      if (this.iconDom_) {
        this.iconDom_.style.color = 'white';
      }
    }

    // This is used for accessibility purposes.
    if (this.htmlDiv_) {
      (Blockly.utils.aria.setState as any)(
        this.htmlDiv_,
        (Blockly.utils.aria.State as any).SELECTED,
        isSelected
      );
    }
  }
}
