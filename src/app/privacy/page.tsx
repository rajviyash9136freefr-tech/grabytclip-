import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How grabytclip handles your data. We collect as little as possible.",
};

export default function PrivacyPage() {
  return (
    <PageShell title="Privacy Policy">
      <p>
        <strong>Last updated:</strong> {new Date().toISOString().slice(0, 10)}
      </p>
      <p>
        grabytclip is built around a simple principle: we collect as little data as
        possible, and we never sell or share your personal information.
      </p>

      <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">
        What we process
      </h2>
      <ul>
        <li>
          <strong>The YouTube URL or video ID you paste</strong> — used only to fetch the
          video information and stream the file you request.
        </li>
        <li>
          <strong>Anonymous, temporary usage data</strong> (page loads, error events) to
          keep the service stable.
        </li>
      </ul>

      <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">
        What we do NOT do
      </h2>
      <ul>
        <li>We do not require you to create an account.</li>
        <li>
          We do not store downloaded files, video metadata, or thumbnails on our servers.
          Everything is streamed and discarded.
        </li>
        <li>We do not run advertising trackers or sell data to third parties.</li>
        <li>We do not request or store your Google/YouTube credentials.</li>
      </ul>

      <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">
        Server logs
      </h2>
      <p>
        Our hosting provider keeps standard access logs (IP address, timestamp, requested
        resource) for security and abuse prevention. We use your IP address transiently
        for rate-limiting (to stop abuse) and it is not stored in a database.
      </p>

      <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">Cookies</h2>
      <p>We do not use tracking cookies. No account or session cookies are set.</p>

      <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">
        Your content
      </h2>
      <p>
        Files you download through grabytclip never transit through or persist on our
        infrastructure beyond the moment of the active stream, which is not stored.
      </p>

      <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">Contact</h2>
      <p>
        Questions about this policy? Reach out at{" "}
        <a
          href="mailto:privacy@grabytclip.com"
          className="text-[var(--accent)] hover:underline"
        >
          privacy@grabytclip.com
        </a>
        .
      </p>
    </PageShell>
  );
}
