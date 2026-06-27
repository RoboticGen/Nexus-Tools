"use client";

import { SessionProvider } from "@nexus-tools/ui";
import { ConfigProvider } from "antd";
import React from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ConfigProvider>
        {children}
      </ConfigProvider>
    </SessionProvider>
  );
}

