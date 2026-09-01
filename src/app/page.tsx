import type { Metadata } from "next";
import { HomeClient } from "@/components/home-client";

export const metadata: Metadata = {
  title: "grabytclip — Download YouTube Videos & Audio in 4K, 2K, 1080p",
  description:
    "Free YouTube downloader: download videos in 4K, 2K, 1080p, 720p; extract audio as MP3 or M4A; grab thumbnails; copy descriptions and hashtags. No account needed.",
  alternates: {
    canonical: "/",
  },
};

export default function HomePage() {
  return <HomeClient />;
}
