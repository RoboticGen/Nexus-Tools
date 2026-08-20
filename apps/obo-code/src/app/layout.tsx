import { THEME_STORAGE_KEY } from "@nexus-tools/design-system/lib/theme";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";

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
  title: "Obo Code",
  description:
    "Obo Code: Write and run Python code in the browser, with turtle graphics and ESP32 device support.",
  keywords: [
    "Obo Code",
    "python",
    "turtle graphics",
    "esp32",
    "micropython",
    "web application",
    "roboticgen academy",
    "roboticgen",
  ],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Obo Code",
    description: "Write and run Python code in the browser, with turtle graphics and ESP32 device support.",
    images: ["/images/OboCode.webp"],
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
        {/* Preload images */}
        <link rel="preload" as="image" href="/images/OboCode.webp" />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
