import type { Metadata } from "next";
import { Roboto } from "next/font/google";

import "@/styles/globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Obo Code",
  description:
    "Obo Code: Run Python Turtle library with Skulpt interpretation support",
  keywords: [
    "Obo Code",
    "python",
    "skulpt",
    "web application",
    "roboticgen academy",
    "roboticgen",
    "turtle graphics",
  ],
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={roboto.className}>{children}</body>
    </html>
  );
}
