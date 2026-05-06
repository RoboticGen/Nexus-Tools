"use client";

import { SessionProvider } from "@nexus-tools/ui";
import React from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}

