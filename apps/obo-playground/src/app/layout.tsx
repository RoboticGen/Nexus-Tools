
import { WorkspaceNavbar } from "@nexus-tools/design-system/components/workspace-navbar";
import { THEME_STORAGE_KEY } from "@nexus-tools/design-system/lib/theme";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";

import { Providers } from "./providers";

import type { Metadata } from "next";

import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OBO Playground",
  description: "OBO Playground - Part of Nexus Tools",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Resolved server-side so an explicit theme choice never flashes on load.
  const theme = (await cookies()).get(THEME_STORAGE_KEY)?.value;

  return (
    <html lang="en" className={theme === "dark" ? "dark" : undefined}>
      <body className={inter.className}>
        <Providers>
          <WorkspaceNavbar title="Obo Playground" />
          {children}
        </Providers>
      </body>
    </html>
  );
}
