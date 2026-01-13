import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "An investor relationship hub for best-in-class founders - Valyxo.vc",
  description:
    "Founder-friendly fundraising, stakeholder communication, and reporting tools for startup founders and the investors who back them.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  openGraph: {
    title: "An investor relationship hub for best-in-class founders",
    description:
      "Founder-friendly fundraising, stakeholder communication, and reporting tools for startup founders and the investors who back them.",
    images: ["/_astro/open-graph-main.uAAMy7BU.jpg"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@valyxo",
    creator: "@valyxo",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased relative bg-dark`}>
        {children}
      </body>
    </html>
  );
}
