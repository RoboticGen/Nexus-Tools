// Hex mirror of the `--brand-*` / `--tone-*` tokens in styles/theme.css, for callers that cannot read CSS. Blockly is the reason: it derives each block's gradient and border from a literal value at inject time, so `var(--brand-teal)` yields a black block.
// A mirror, not a second source of truth — if a token changes in theme.css, change it here too. Nothing enforces that.

/** The eight brand hues. `--brand-*` in theme.css. */
export const BRAND = {
  gold: "#fdb713",
  teal: "#219cbc",
  navy: "#022f49",
  grey: "#939598",
  ink: "#1f2022",
  coral: "#e87a55",
  sky: "#54afe7",
  green: "#43b268",
} as const;

/** Deepened variants, from the tone scale's `--tone-*-contrast` values. */
export const BRAND_DEEP = {
  sky: "#185f8b",
  teal: "#125f75",
  green: "#1c6e3d",
  gold: "#7a5100",
  grey: "#52555a",
  // No `-contrast` token exists for coral; darkened the same way the others were, since BRAND.coral is 2.6:1 on white.
  coral: "#a34a28",
  // NOT a brand hue. Blockly needs twelve distinguishable categories and the brand yields eleven that survive the white-text constraint. If the workspace keeps needing a twelfth, it belongs in theme.css as a real token.
  violet: "#5b3f8f",
} as const;

/** Semantic tones that are not brand hues. `--tone-danger*` in theme.css. */
export const TONE = {
  danger: "#dc2626",
  dangerDeep: "#a11d1d",
} as const;

// The only two foregrounds the tone scale puts on a brand colour.
const ON_DARK = "#022f49"; // --tone-warning-on / --tone-info-on / --tone-neutral-on
const ON_LIGHT = "#ffffff"; // --tone-danger-on

/** Any CSS colour Blockly might hand back → 0–255 channels. */
function toRgb(colour: string): [number, number, number] | null {
  const value = colour.trim().toLowerCase();

  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const digits =
      hex[1].length === 3
        ? hex[1]
            .split("")
            .map((d) => d + d)
            .join("")
        : hex[1];
    return [
      parseInt(digits.slice(0, 2), 16),
      parseInt(digits.slice(2, 4), 16),
      parseInt(digits.slice(4, 6), 16),
    ];
  }

  const rgb = value.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];

  return null;
}

/** WCAG relative luminance. */
function luminance([r, g, b]: [number, number, number]): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: number, b: number): number {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

// Computed, not looked up by hex: Blockly normalises a colour before handing it back, so an exact-string map misses every entry and falls through to white.
/** The readable foreground for a brand colour, whichever of the two has more contrast. */
export function onColor(colour: string): string {
  const rgb = toRgb(colour);
  if (!rgb) return ON_LIGHT;

  const bg = luminance(rgb);
  const darkContrast = contrast(bg, luminance(toRgb(ON_DARK)!));
  const lightContrast = contrast(bg, luminance(toRgb(ON_LIGHT)!));

  return darkContrast >= lightContrast ? ON_DARK : ON_LIGHT;
}
