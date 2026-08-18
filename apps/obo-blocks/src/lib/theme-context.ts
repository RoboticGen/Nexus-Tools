"use client";

import { createContext } from "react";

import type { ThemeContextValue } from "@/lib/theme";

/**
 * Split out of `theme.ts` so the constants there stay importable from Server
 * Components — `layout.tsx` reads `THEME_STORAGE_KEY` to resolve the theme
 * cookie during SSR, and `createContext` in that module would make it
 * client-only and fail the build.
 */
export const ThemeContext = createContext<ThemeContextValue | null>(null);
