import { Inter } from "next/font/google";

import { LogoutButton } from "@/components/logout-button";

import { Providers } from "./providers";

import type { Metadata } from "next";

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
        <Providers>
          <header className="playground-nav">
            <span className="playground-title">OBO Playground</span>
            <LogoutButton />
          </header>
          {children}
        </Providers>
      </body>
    </html>
  );
}
