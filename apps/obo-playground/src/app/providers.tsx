"use client";

import { SessionProvider } from "@nexus-tools/auth/session-provider";
import { ThemeProvider } from "@nexus-tools/design-system/components/theme-provider";
import { Toaster } from "@nexus-tools/design-system/components/ui/sonner";
import React from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        {children}
        <Toaster />
      </ThemeProvider>
    </SessionProvider>
  );
}
