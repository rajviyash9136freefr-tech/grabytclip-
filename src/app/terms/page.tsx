import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms governing use of grabytclip.",
};

export default function TermsPage() {
  return (
    <PageShell title="Terms of Service">
      <p>
        <strong>Last updated:</strong> {new Date().toISOString().slice(0, 10)}
      </p>
      <p>
        By using grabytclip, you agree to the following terms. If you do not agree, please
        do not use the service.
      </p>

      <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">
        Acceptable use
      </h2>
      <ul>
        <li>
          You are responsible for how you use downloaded content. Only download material
          you have the legal right to use — your own videos, videos under a permissive
          license (such as Creative Commons), or content you have permission to download.
        </li>
        <li>
          You agree to comply with YouTube&apos;s Terms of Service and all applicable laws
          in your jurisdiction, as well as any copyright and intellectual-property laws.
        </li>
        <li>
          You may not use grabytclip to circumvent access controls, to download
          age-restricted content you are not permitted to view, or to facilitate
          infringement.
        </li>
        <li>
          You may not attempt to disrupt the service, overload it, or bypass its
          rate-limiting or abuse protections.
        </li>
      </ul>

      <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">
        Service availability
      </h2>
      <p>
        The service is provided &quot;as is&quot; and &quot;as available&quot;. We do not
        guarantee uninterrupted availability, and we may modify, suspend, or discontinue
        any part of the service at any time without notice.
      </p>

      <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">
        Limitation of liability
      </h2>
      <p>
        To the maximum extent permitted by law, grabytclip shall not be liable for any
        direct, indirect, incidental, or consequential damages arising from your use of,
        or inability to use, the service.
      </p>

      <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">
        Intellectual property
      </h2>
      <p>
        The grabytclip name, logo, and website design are our property. All video content,
        music, images, and text you download through the service belong to their
        respective owners.
      </p>

      <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">Changes</h2>
      <p>
        We may update these terms from time to time. Continued use of the service after
        changes constitutes acceptance of the revised terms.
      </p>
    </PageShell>
  );
}
