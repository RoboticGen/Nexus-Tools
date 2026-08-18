/**
 * Theme constants and types — no React, no `"use client"`.
 *
 * The React context lives in `theme-context.ts` instead, because `layout.tsx`
 * is a Server Component and imports `THEME_STORAGE_KEY` from here to read the
 * theme cookie. A `createContext` call anywhere in this module's graph makes
 * the whole module client-only, and the build fails with "You're importing a
 * module that depends on `createContext` into a React Server Component".
 */

/** `system` follows the OS setting and keeps following it as it changes. */
export type Theme = "light" | "dark" | "system"

/** What `system` collapses to once resolved — the two real themes. */
export type ResolvedTheme = "light" | "dark"

/**
 * `localStorage` key. Mirrored into a cookie of the same name so the *server*
 * can resolve the theme and stamp `.dark` onto `<html>` in the initial HTML.
 *
 * The usual trick here is a blocking inline `<script>` in the document head,
 * but React 19 warns on any script element rendered by a component ("Scripts
 * inside React components are never executed when rendering on the client"),
 * and `next/script` warns identically. A cookie needs no script at all.
 */
export const THEME_STORAGE_KEY = "roboticgen-theme"

/** One year, in seconds — the choice should outlive a session. */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export const DARK_CLASS = "dark"

export type ThemeContextValue = {
  /** The user's choice, including `system`. */
  theme: Theme
  /** The theme actually on screen. */
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system"
}
