import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "grabytclip — Download YouTube Videos & Audio",
    template: "%s — grabytclip",
  },
  description:
    "Download YouTube videos in 4K, 2K, 1080p, extract audio as MP3 or M4A, grab thumbnails, copy descriptions and hashtags — fast, free, no account needed.",
  keywords: [
    "YouTube downloader",
    "video downloader",
    "4K video download",
    "YouTube to MP3",
    "thumbnail downloader",
    "free YouTube tool",
  ],
  robots: { index: true, follow: true },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://grabytclip.com",
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL ?? "https://grabytclip.com",
    siteName: "grabytclip",
    title: "grabytclip — Download YouTube Videos & Audio",
    description:
      "Download YouTube videos in 4K, 2K, 1080p, extract audio as MP3 or M4A, grab thumbnails, copy descriptions and hashtags.",
  },
  twitter: {
    card: "summary_large_image",
    title: "grabytclip — Download YouTube Videos & Audio",
    description:
      "Download YouTube videos in 4K, 2K, 1080p, extract audio as MP3 or M4A, grab thumbnails, copy descriptions and hashtags.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
