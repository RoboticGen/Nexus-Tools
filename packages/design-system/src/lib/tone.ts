// The tone CSS lives in the theme (`[data-tone]` / `[data-appearance]`); these name what a component may ask for.

/** Semantic weight of a value, not a hue. `brand` is for neutral emphasis. */
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand'

/** How much visual weight to give it. */
export type Appearance = 'soft' | 'solid' | 'outline' | 'dot'
