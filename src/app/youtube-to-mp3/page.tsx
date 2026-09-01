import type { Metadata } from "next";
import { ToolPage } from "@frontend/components/tool-page";
import { toolPages } from "@frontend/lib/seo";

const tool = toolPages["youtube-to-mp3"]!;

export const metadata: Metadata = {
  title: tool.metadataTitle,
  description: tool.description,
  alternates: { canonical: `/youtube-to-mp3` },
  openGraph: {
    title: tool.metadataTitle,
    description: tool.description,
  },
};

export default function YoutubeToMp3Page() {
  return <ToolPage tool={tool} />;
}
