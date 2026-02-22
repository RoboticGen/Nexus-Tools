import { Inter } from "next/font/google";

import type { Metadata, Viewport } from "next";

import "@/styles/globals.css";
import "antd/dist/reset.css";
import "@nexus-tools/esp32-uploader/styles";

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
    title: "Obo Code",
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
        {/* Preload fonts to prevent FOUC */}
        <link rel="preload" as="font" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
        {/* Preload images */}
        <link rel="preload" as="image" href="/academyLogo.webp" />
        <link rel="preload" as="image" href="/obo_blocks.webp" />
        <link rel="prefetch" as="image" href="/editing.gif" />
        {/* Critical inline styles to prevent layout shift during CSS load */}
        <style dangerouslySetInnerHTML={{__html: `
          html, body {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: "Inter", system-ui, sans-serif;
            font-weight: 400;
            background-color: #f0f4f8;
            overflow: hidden;
            height: 100%;
            width: 100%;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          #__next {
            height: 100vh;
            width: 100vw;
          }
          .app-container {
            display: flex;
            flex-direction: column;
            height: 100vh;
            overflow: hidden;
            width: 100%;
          }
          /* Hide all buttons until app initializes */
          button, .ant-btn, .action-btn {
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
          }
          /* Show buttons when app is ready */
          html.app-ready button, 
          html.app-ready .ant-btn, 
          html.app-ready .action-btn {
            opacity: 1;
            pointer-events: auto;
          }
        `}} />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
