import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";

import "@/styles/globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="msvalidate.01" content="F880277201EB0168D24B534ADC14C549" />
        <link rel="preload" as="image" href="/academyLogo.webp" />
        <link rel="preload" as="image" href="/obo_blocks.webp" />
        <link rel="prefetch" as="image" href="/editing.gif" />
      </head>
      <body className={roboto.className}>{children}</body>
    </html>
  );
}
