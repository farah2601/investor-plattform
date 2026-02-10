import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.valyxo.com"),
  title: "Valyxo — Stop explaining your numbers",
  description: "Connect your systems. Get live metrics — built for startups raising capital.",
  openGraph: {
    siteName: "Valyxo",
    type: "website",
    url: "https://www.valyxo.com",
    title: "Valyxo — Stop explaining your numbers",
    description: "Connect your systems. Get live metrics — built for startups raising capital.",
    images: [
      {
        url: "/og/valyxo-og.jpg",
        width: 1200,
        height: 630,
        alt: "Valyxo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@valyxo",
    creator: "@valyxo",
    title: "Valyxo — Stop explaining your numbers",
    description: "Connect your systems. Get live metrics — built for startups raising capital.",
    images: ["/og/valyxo-og.jpg"],
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
