"use client";

import { useContext } from "react";

import { ThemeContext } from "@/lib/theme-context";

import type { ThemeContextValue } from "@/lib/theme";

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside a <ThemeProvider>");
  }

  return context;
}
