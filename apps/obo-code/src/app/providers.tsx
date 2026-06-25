"use client";

import { ConfigProvider } from "antd";
import React from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider>
      {children}
    </ConfigProvider>
  );
}
