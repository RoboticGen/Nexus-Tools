"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ThemeContext } from "@/lib/theme-context";
import {
  DARK_CLASS,
  isTheme,
  THEME_COOKIE_MAX_AGE,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type Theme,
} from "@/lib/theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function readStoredTheme(fallback: Theme): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : fallback;
  } catch {
    // Storage can throw outright in private/partitioned contexts.
    return fallback;
  }
}

function readSystemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

type ThemeProviderProps = {
  children: React.ReactNode;
  /**
   * Used when nothing is stored yet. Light rather than `system`: obo-code is
   * used in classrooms on shared machines whose OS theme is whatever the last
   * person left it as, and the editor/turtle surfaces are designed light-first.
   * `system` is still selectable in the toggle.
   */
  defaultTheme?: Theme;
};

/**
 * Ported from the design system's own `theme-provider.tsx` rather than pulled
 * from the registry — the theme runtime (`lib/theme.ts`, this provider,
 * `use-theme`) is not published as a registry item.
 *
 * One deliberate deviation from the source: the lazy `useState` initialisers
 * there read `localStorage`/`matchMedia` directly, which throws during Next's
 * server render, so they start from the default and sync in an effect. The
 * blocking script in `layout.tsx` is what covers the gap before hydration.
 */
export function ThemeProvider({ children, defaultTheme = "light" }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>("light");

  // Hydrate from storage/OS on the client only. Rendering the stored value
  // straight away would mismatch the server's markup; the blocking script in
  // `layout.tsx` is what prevents the flash in the meantime.
  useEffect(() => {
    setThemeState(readStoredTheme(defaultTheme));
    setSystemTheme(readSystemTheme());
  }, [defaultTheme]);

  // Keep tracking the OS even while `theme` is pinned, so switching back to
  // `system` lands on the current setting rather than a stale one.
  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    document.documentElement.classList.toggle(DARK_CLASS, resolvedTheme === "dark");
  }, [resolvedTheme]);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Non-fatal: the theme still applies, it just won't survive a reload.
    }
    // The cookie is what the server reads to stamp `.dark` onto <html> in the
    // initial HTML, so an explicit light/dark choice never flashes on reload.
    // `SameSite=Lax` because this is a display preference, not a credential.
    document.cookie = `${THEME_STORAGE_KEY}=${next};path=/;max-age=${THEME_COOKIE_MAX_AGE};SameSite=Lax`;
    setThemeState(next);
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
