import { onColor } from "@nexus-tools/design-system/lib/palette";
import * as Blockly from "blockly/core";

export class OboCategory extends Blockly.ToolboxCategory {
  colour_: string = "";
  rowDiv_: HTMLDivElement | null = null;
  htmlDiv_: HTMLDivElement | null = null;
  iconDom_: HTMLElement | null = null;
  barDiv_: HTMLDivElement | null = null;

  /** @override */
  constructor(categoryDef: any, toolbox: any, opt_parent: any) {
    super(categoryDef, toolbox, opt_parent);

    // Deferred: rowDiv_ does not exist until Blockly has built the category DOM.
    setTimeout(() => {
      if (this.rowDiv_) {
        this.rowDiv_.style.borderRadius = '6px';
        this.rowDiv_.style.padding = '4px 8px';
        this.rowDiv_.style.transition = 'all 0.2s ease';
        this.rowDiv_.style.position = 'relative';
        this.rowDiv_.style.marginBottom = '8px';
        this.rowDiv_.style.marginLeft = '4px';
        this.rowDiv_.style.marginRight = '4px';
        this.rowDiv_.style.display = 'flex';
        this.rowDiv_.style.alignItems = 'center';
        this.rowDiv_.style.overflow = 'visible';

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

  /** Paints label and icon to contrast against `background` — not always the category colour, since a selected row flips to white. */
  private applyForeground_(background: string = this.colour_) {
    const foreground = onColor(background);

    // `labelDom_` off the base class rather than a class-name query: Blockly 13 renamed `.blocklyTreeLabel` to `.blocklyToolboxCategoryLabel`, and the stale lookup failed silently.
    const labelDom = (this as unknown as { labelDom_: HTMLElement | null }).labelDom_;
    if (labelDom) {
      labelDom.style.color = foreground;
    }

    if (this.iconDom_) {
      this.iconDom_.style.color = foreground;
    }
  }

  /** @override */
  addColourBorder_(colour: string) {
    this.colour_ = colour;
    if (this.rowDiv_) {
      this.rowDiv_.style.backgroundColor = colour;
    }
    // Deferred: Blockly builds the label element after calling this, so colouring it synchronously finds nothing.
    setTimeout(() => this.applyForeground_(), 0);
  }

  /** @override */
  setSelected(isSelected: boolean) {
    // A selected row inverts: white pill, category-coloured text.
    const background = isSelected ? '#ffffff' : this.colour_;

    if (this.rowDiv_) {
      this.rowDiv_.style.backgroundColor = background;
      this.rowDiv_.style.color = isSelected ? this.colour_ : onColor(background);
      this.rowDiv_.style.borderRadius = '6px';
      this.rowDiv_.style.userSelect = 'none';
      this.rowDiv_.style.cursor = 'pointer';
    }

    this.applyForeground_(background);

    if (this.barDiv_) {
      this.barDiv_.style.backgroundColor = isSelected ? this.colour_ : 'transparent';
    }

    if (this.htmlDiv_) {
      (Blockly.utils.aria.setState as any)(
        this.htmlDiv_,
        (Blockly.utils.aria.State as any).SELECTED,
        isSelected
      );
    }
  }
}
