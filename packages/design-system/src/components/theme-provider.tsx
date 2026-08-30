"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

import {
  DARK_CLASS,
  isTheme,
  THEME_COOKIE_MAX_AGE,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type Theme,
} from "@nexus-tools/design-system/lib/theme";
import { ThemeContext } from "@nexus-tools/design-system/lib/theme-context";

const DARK_QUERY = "(prefers-color-scheme: dark)";

/** `localStorage` fires `storage` only in other tabs, so a write here has to notify by hand. */
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribeStoredTheme(onChange: () => void) {
  listeners.add(onChange);
  // Still worth listening: this keeps two open tabs in step.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : null;
  } catch {
    // Storage can throw outright in private/partitioned contexts.
    return null;
  }
}

function subscribeSystemTheme(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function readSystemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

type ThemeProviderProps = {
  children: React.ReactNode;
  /** Light rather than `system`: these run on shared classroom machines whose OS theme is whatever the last person left it as. */
  defaultTheme?: Theme;
};

// Both the stored preference and the OS setting live outside React and are unreadable during a server render, hence `useSyncExternalStore` with a server snapshot. That snapshot is deliberately "nothing stored, system is light": `layout.tsx` has already stamped `.dark` from the cookie, so the page is painted before this renders.
export function ThemeProvider({ children, defaultTheme = "light" }: ThemeProviderProps) {
  const storedTheme = useSyncExternalStore(
    subscribeStoredTheme,
    readStoredTheme,
    () => null
  );
  const systemTheme = useSyncExternalStore(
    subscribeSystemTheme,
    readSystemTheme,
    () => "light" as ResolvedTheme
  );

  const theme = storedTheme ?? defaultTheme;
  const resolvedTheme = theme === "system" ? systemTheme : theme;

  // Writing to the DOM outside React's tree is what an effect is actually for.
  useEffect(() => {
    document.documentElement.classList.toggle(DARK_CLASS, resolvedTheme === "dark");
  }, [resolvedTheme]);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Non-fatal: the theme still applies, it just won't survive a reload.
    }
    // The cookie is what the server reads to stamp `.dark` onto <html> in the initial HTML, so an explicit light/dark choice never flashes on reload. `SameSite=Lax` because this is a display preference, not a credential.
    document.cookie = `${THEME_STORAGE_KEY}=${next};path=/;max-age=${THEME_COOKIE_MAX_AGE};SameSite=Lax`;
    emit();
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
