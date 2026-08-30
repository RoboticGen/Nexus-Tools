"use client";

import { useContext } from "react";

import { ThemeContext } from "@nexus-tools/design-system/lib/theme-context";

import type { ThemeContextValue } from "@nexus-tools/design-system/lib/theme";

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside a <ThemeProvider>");
  }

  return context;
}
