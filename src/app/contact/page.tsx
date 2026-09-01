import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@frontend/components/page-shell";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with grabytclip. Questions, feedback, or support requests? Contact us by email or through our channels — we reply as quickly as we can.",
};

export default function ContactPage() {
  return (
    <PageShell title="Contact us">
      <p>
        Have a question, a suggestion, or need help with a download? We read every message
        and do our best to reply within 24 hours on weekdays.
      </p>

      <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">By email</h2>
      <p>
        The fastest way to reach us is by email. For support issues, please include the
        video URL and a short description of the problem so we can help sooner.
      </p>
      <ul>
        <li>
          <strong>Support &amp; help:</strong>{" "}
          <a
            href="mailto:support@grabytclip.com"
            className="text-[var(--accent)] hover:underline"
          >
            support@grabytclip.com
          </a>
        </li>
        <li>
          <strong>Partnerships &amp; press:</strong>{" "}
          <a
            href="mailto:hello@grabytclip.com"
            className="text-[var(--accent)] hover:underline"
          >
            hello@grabytclip.com
          </a>
        </li>
        <li>
          <strong>Privacy questions:</strong>{" "}
          <a
            href="mailto:privacy@grabytclip.com"
            className="text-[var(--accent)] hover:underline"
          >
            privacy@grabytclip.com
          </a>
        </li>
      </ul>

      <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">
        Before you write
      </h2>
      <p>
        Many common questions are already answered on our{" "}
        <Link href="/#faq" className="text-[var(--accent)] hover:underline">
          FAQ page
        </Link>
        . If a download fails, it&apos;s often because the video is private,
        age-restricted, or unavailable in your region — see the{" "}
        <Link href="/disclaimer" className="text-[var(--accent)] hover:underline">
          disclaimer
        </Link>{" "}
        for details on permitted use.
      </p>

      <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">
        Response time
      </h2>
      <p>
        We aim to respond to all messages within 24 hours on weekdays. During busier
        periods, support requests are handled in the order they arrive.
      </p>
    </PageShell>
  );
}
