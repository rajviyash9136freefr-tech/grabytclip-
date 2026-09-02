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

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://grabytclip.rajviyash9136freefr.workers.dev";
const googleSiteVerification = process.env.GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  title: {
    default: "Free YouTube Video Downloader — 4K Video & MP3 Audio",
    template: "%s | grabytclip",
  },
  description:
    "Free YouTube video downloader: save videos in 4K, 2K, 1080p, 720p, 480p or 360p, convert to MP3/M4A audio, download thumbnails, and copy descriptions & hashtags. No account needed.",
  keywords: [
    "YouTube downloader",
    "YouTube video downloader",
    "YouTube to MP4",
    "YouTube to MP3",
    "free video downloader",
    "4K video download",
    "YouTube Shorts downloader",
    "YouTube thumbnail downloader",
    "MP3 converter",
    "free YouTube tool",
  ],
  robots: { index: true, follow: true },
  metadataBase: new URL(appUrl),
  alternates: {
    canonical: "/",
  },
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: { url: "/favicon.ico" },
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  appleWebApp: {
    title: "grabytclip",
    capable: true,
    statusBarStyle: "black-translucent",
  },
  verification: googleSiteVerification ? { google: googleSiteVerification } : undefined,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: appUrl,
    siteName: "grabytclip",
    title: "Free YouTube Video Downloader — 4K Video & MP3 Audio",
    description:
      "Download YouTube videos in 4K, 2K, 1080p, convert to MP3/M4A, grab thumbnails, and copy descriptions & hashtags — fast, free, no account.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free YouTube Video Downloader — 4K Video & MP3 Audio",
    description:
      "Download YouTube videos in 4K, 2K, 1080p, convert to MP3/M4A, grab thumbnails, and copy descriptions & hashtags — fast, free, no account.",
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
