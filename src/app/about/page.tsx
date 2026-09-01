import type { Metadata } from "next";
import { PageShell } from "@frontend/components/page-shell";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about grabytclip — a free, fast YouTube downloader and metadata tool.",
};

export default function AboutPage() {
  return (
    <PageShell title="About grabytclip">
      <p>
        grabytclip is a free, no-account YouTube downloader and metadata toolkit. Paste a
        link and get instant access to:
      </p>
      <ul>
        <li>
          <strong>Video downloads</strong> in 4K, 2K, 1080p, 720p and below (up to what
          the source provides).
        </li>
        <li>
          <strong>Audio extraction</strong> as high-quality M4A or MP3.
        </li>
        <li>
          <strong>Thumbnail downloads</strong> in high resolution.
        </li>
        <li>
          <strong>Copy tools</strong> for video descriptions and hashtags.
        </li>
      </ul>
      <p>
        Everything runs server-side on our infrastructure, is streamed directly to you,
        and is never stored on our servers. We don&apos;t require accounts, track you for
        advertising, or sell your data.
      </p>
    </PageShell>
  );
}
