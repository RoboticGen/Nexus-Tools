import { THEME_STORAGE_KEY } from "@nexus-tools/design-system/lib/theme";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";

import { Providers } from "./providers";

import type { Metadata } from "next";

import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  title: "OBO Playground",
  description: "Program the OBO Car with blocks and watch it drive in a 3D simulator.",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    url: "/",
    title: "OBO Playground",
    description: "Program the OBO Car with blocks and watch it drive in a 3D simulator.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "OBO Playground" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OBO Playground",
    description: "Program the OBO Car with blocks and watch it drive in a 3D simulator.",
    images: ["/og-image.png"],
  },
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
