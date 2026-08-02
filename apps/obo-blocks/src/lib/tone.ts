export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand'

/** How much visual weight to give it. */
export type Appearance = 'soft' | 'solid' | 'outline' | 'dot'

export const TONES: readonly Tone[] = [
  'neutral',
  'info',
  'success',
  'warning',
  'danger',
  'brand',
] as const

/**
 * Normalises a status for lookup: trims, uppercases, and folds spaces and
 * hyphens to underscores. So `"In Progress"`, `"in-progress"` and
 * `"IN_PROGRESS"` are the same key.
 */
export function normalizeStatus(status: string): string {
  return status.trim().toUpperCase().replace(/[\s-]+/g, '_')
}

/**
 * Default status → tone mapping, keyed by normalised status.
 *
 * Every key is a status that actually appears in the LMS. Grouped by what the
 * status means to a student, not by the colour it happened to be:
 *
 * - success — the thing is done or confirmed
 * - info    — under way or scheduled; nothing is wrong
 * - warning — stalled or needs attention, but not failed
 * - danger  — failed, cancelled or blocked
 * - neutral — not started, or simply unknown
 *
 * `ONLINE` / `PHYSICAL` are deliberately absent. They are categorical, not
 * semantic — a physical session is not "better" than an online one — so they
 * should be passed an explicit tone at the call site rather than inheriting a
 * meaning from this table.
 */
export const DEFAULT_STATUS_TONES: Readonly<Record<string, Tone>> = {
  // Done
  COMPLETED: 'success',
  COMPLETE: 'success',
  HELD: 'success',
  CONFIRMED: 'success',
  APPROVED: 'success',
  ACTIVE: 'success',
  SUBMITTED: 'success',
  PAID: 'success',

  // Under way
  IN_PROGRESS: 'info',
  SCHEDULED: 'info',
  IN_REVIEW: 'info',
  REVIEW: 'info',
  PENDING: 'info',
  WAITING: 'info',
  UPCOMING: 'info',

  // Needs attention
  ON_HOLD: 'warning',
  PAUSED: 'warning',
  OVERDUE: 'warning',
  PAYMENT_DUE: 'warning',
  AT_RISK: 'warning',
  EXPIRING: 'warning',

  // Failed
  BLOCKED: 'danger',
  CANCELLED: 'danger',
  CANCELED: 'danger',
  REJECTED: 'danger',
  FAILED: 'danger',
  EXPIRED: 'danger',

  // Not begun
  NOT_STARTED: 'neutral',
  TODO: 'neutral',
  DRAFT: 'neutral',
  ARCHIVED: 'neutral',
}

/**
 * Resolves a status string to a tone, falling back to `neutral`.
 *
 * Pass `map` to extend or override for a domain that disagrees — e.g. a
 * pipeline where `PENDING` is a problem rather than normal progress:
 *
 * ```ts
 * toneFromStatus(order.status, { ...DEFAULT_STATUS_TONES, PENDING: 'warning' })
 * ```
 */
export function toneFromStatus(
  status: string | null | undefined,
  map: Readonly<Record<string, Tone>> = DEFAULT_STATUS_TONES
): Tone {
  if (!status) return 'neutral'

  return map[normalizeStatus(status)] ?? 'neutral'
}

/**
 * Maps an Airtable colour name (`greenBright`, `yellowLight1`, `blueDark2`, …)
 * to a tone by its hue family.
 *
 * Parsing the family beats enumerating the values. obo-nexus's
 * `lib/airtable-colors.ts` hardcodes twelve names and falls open to grey on
 * anything else — but Airtable emits the full cross product of ~10 hues and
 * ~7 shades, so most real values miss the table and render grey.
 */
/**
 * Hue prefix → tone. Order is irrelevant: no hue here is a prefix of another.
 *
 * Matched by prefix rather than by splitting the camelCase name, because the
 * shade suffix is not reliably capitalised — Airtable emits `greenBright`,
 * `green`, and `greenLight1`, and a case-insensitive `^[a-z]+` match swallows
 * the whole name and resolves everything to neutral.
 */
const HUE_TONES: readonly (readonly [string, Tone])[] = [
  ['green', 'success'],
  ['red', 'danger'],
  ['orange', 'warning'],
  ['yellow', 'warning'],
  ['blue', 'info'],
  ['purple', 'info'],
  ['cyan', 'info'],
  ['teal', 'brand'],
  // gray, pink and brown carry no status meaning.
] as const

export function toneFromAirtableColor(color: string | null | undefined): Tone {
  if (!color) return 'neutral'

  const value = color.trim().toLowerCase()

  return HUE_TONES.find(([hue]) => value.startsWith(hue))?.[1] ?? 'neutral'
}

/**
 * Turns a machine status into a label: `"IN_PROGRESS"` → `"In Progress"`.
 *
 * Only for statuses with no human label of their own. If the API already
 * returns display text, render that.
 */
export function humanizeStatus(status: string): string {
  return normalizeStatus(status)
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
