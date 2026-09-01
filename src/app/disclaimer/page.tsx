import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: "Legal disclaimer for grabytclip — a YouTube download tool.",
};

export default function DisclaimerPage() {
  return (
    <PageShell title="Disclaimer">
      <p>
        grabytclip is an independent, third-party tool. We are{" "}
        <strong>not affiliated with, endorsed by, or sponsored by</strong> YouTube, Google
        LLC, or any of their subsidiaries.
      </p>

      <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">Trademarks</h2>
      <p>
        YouTube and the YouTube logo are trademarks of Google LLC. All other trademarks
        and content belong to their respective owners. Reference to any product or service
        on this site does not imply endorsement.
      </p>

      <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">
        Copyright notice
      </h2>
      <p>
        Downloading videos from YouTube may violate YouTube&apos;s Terms of Service and
        may infringe copyright. The responsibility for how you use this tool — and any
        content you download — lies entirely with you. We strongly encourage you to:
      </p>
      <ul>
        <li>Only download content you own or have explicit permission to download.</li>
        <li>
          Prefer content released under Creative Commons or similar permissive licenses.
        </li>
        <li>Use downloads for personal, offline, or archival purposes only.</li>
        <li>Respect the rights of content creators.</li>
      </ul>

      <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">
        No warranty
      </h2>
      <p>
        The service is provided without warranty of any kind, express or implied. We are
        not responsible for any losses, damages, or legal consequences arising from your
        use of the tool.
      </p>

      <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">
        Content accuracy
      </h2>
      <p>
        Metadata (descriptions, hashtags, thumbnails) is provided as-is from YouTube. It
        may be incomplete or outdated, and we make no representations about its accuracy.
      </p>
    </PageShell>
  );
}
