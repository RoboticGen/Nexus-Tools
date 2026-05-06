"use client";

import { ConfigProvider } from "antd";
import { SessionProvider } from "@nexus-tools/ui";
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

