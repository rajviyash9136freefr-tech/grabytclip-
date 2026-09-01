import type { Metadata } from "next";
import { ToolPage } from "@frontend/components/tool-page";
import { toolPages } from "@frontend/lib/seo";

const tool = toolPages["youtube-shorts-downloader"]!;

export const metadata: Metadata = {
  title: tool.metadataTitle,
  description: tool.description,
  alternates: { canonical: `/youtube-shorts-downloader` },
  openGraph: {
    title: tool.metadataTitle,
    description: tool.description,
  },
};

export default function YoutubeShortsDownloaderPage() {
  return <ToolPage tool={tool} />;
}
