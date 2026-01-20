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
  barDiv_: HTMLDivElement | null = null; // the right-side indicator bar

  /**
   * Constructor for a custom category.
   * @override
   */
  constructor(categoryDef: any, toolbox: any, opt_parent: any) {
    super(categoryDef, toolbox, opt_parent);

    setTimeout(() => {
      if (this.rowDiv_) {
        // Rounded pill shape
        this.rowDiv_.style.borderRadius = '6px';
        this.rowDiv_.style.padding = '4px 8px';
        this.rowDiv_.style.transition = 'all 0.2s ease';
        this.rowDiv_.style.position = 'relative';
        this.rowDiv_.style.marginBottom = '8px'; // Gap between categories
        this.rowDiv_.style.marginLeft = '4px'; // Gap from left side
        this.rowDiv_.style.marginRight = '4px'; // Gap from right side
        this.rowDiv_.style.display = 'flex'; // align icon and text nicely
        this.rowDiv_.style.alignItems = 'center';
        this.rowDiv_.style.overflow = 'visible'; // Allow expanded content to show beyond margin

        // Add the right-side indicator bar
        this.barDiv_ = document.createElement('div');
        this.barDiv_.style.position = 'absolute';
        this.barDiv_.style.top = '4px';
        this.barDiv_.style.bottom = '4px';
        this.barDiv_.style.right = '2px';
        this.barDiv_.style.width = '4px';
        this.barDiv_.style.borderRadius = '2px';
        this.barDiv_.style.backgroundColor = 'transparent';
        this.barDiv_.style.transition = 'background-color 0.2s ease';

        this.rowDiv_.appendChild(this.barDiv_);
      }
    }, 0);
  }

  /** @override */
  addColourBorder_(colour: string) {
    this.colour_ = colour; // store colour for later use
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
    if (this.rowDiv_) {
      // Background changes on selection
      this.rowDiv_.style.backgroundColor = isSelected ? 'white' : this.colour_;
      this.rowDiv_.style.color = isSelected ? this.colour_ :'white';
      this.rowDiv_.style.borderRadius = '6px';      // Prevent accidental clicks from expanding category
      this.rowDiv_.style.userSelect = 'none';
      this.rowDiv_.style.cursor = 'pointer';    }

    const labelDom = this.rowDiv_?.getElementsByClassName('blocklyTreeLabel')[0] as HTMLElement;
    if (labelDom) {
      labelDom.style.color = 'white'; // ALWAYS white text
    }

    if (this.iconDom_) {
      this.iconDom_.style.color = 'white'; // icon stays white
    }

    // Update right-side indicator bar
    if (this.barDiv_) {
      this.barDiv_.style.backgroundColor = isSelected ? this.colour_ : 'transparent';
    }

    // Accessibility
    if (this.htmlDiv_) {
      (Blockly.utils.aria.setState as any)(
        this.htmlDiv_,
        (Blockly.utils.aria.State as any).SELECTED,
        isSelected
      );
    }
  }
}
