import { cookies } from "next/headers";
import { Inter } from "next/font/google";

import { THEME_STORAGE_KEY } from "@/lib/theme";

import { Providers } from "./providers";

import type { Metadata, Viewport } from "next";

import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Obo Blocks",
  description:
    "Obo Blocks: Convert Scratch Blocks to Python with Pyodide interpretation support and MicroPython extensions for seamless web-based Python execution.",
  keywords: [
    "Obo Blocks",
    "python",
    "google",
    "scratch",
    "Blockly",
    "visual programming",
    "pyodide",
    "web application",
    "roboticgen academy",
    "roboticgen",
  ],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Obo Blocks",
    description:
      "Convert Scratch Blocks to Python with Pyodide interpretation support and MicroPython extensions",
    images: ["/obo_blocks.webp"],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /*
    Resolve the theme on the server so `.dark` is in the initial HTML and an
    explicit choice never flashes. `ThemeProvider` mirrors its `localStorage`
    value into this cookie for exactly this read.

    Deliberately no inline `<script>`: React 19 warns on script elements
    rendered by a component (`next/script` included), and this needs none.
    `system` is the one case the server cannot resolve — the OS preference
    isn't sent with the request — so it stays light until the provider's
    effect corrects it. The default is light, so that path is the rare one.
  */
  const theme = (await cookies()).get(THEME_STORAGE_KEY)?.value;

  return (
    <html lang="en" className={theme === "dark" ? "dark" : undefined}>
      <head>
        <meta name="msvalidate.01" content="F880277201EB0168D24B534ADC14C549" />
        <link rel="preload" as="image" href="/obo_blocks.webp" />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
