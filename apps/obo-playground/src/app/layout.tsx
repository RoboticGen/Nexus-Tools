import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import { LogoutButton } from "@/components/logout-button";

import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OBO Playground",
  description: "OBO Playground - Part of Nexus Tools",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <header className="playground-nav">
          <span className="playground-title">OBO Playground</span>
          <LogoutButton />
        </header>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
