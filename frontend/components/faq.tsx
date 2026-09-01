import type { FaqItem } from "@frontend/lib/seo";
import { SectionHeading } from "@frontend/components/section-heading";

interface FaqProps {
  items: FaqItem[];
  label?: string;
  heading?: string;
}

/**
 * SEO-friendly FAQ accordion built on native <details>/<summary> — no client JS,
 * fully crawlable, and the questions/answers stay in the initial HTML payload.
 */
export function Faq({ items, label = "Got questions?", heading = "Frequently asked questions" }: FaqProps) {
  return (
    <section id="faq" className="mx-auto w-full max-w-[760px] px-4 pb-24">
      <SectionHeading label={label} heading={heading} />

      <div className="space-y-3">
        {items.map((item, i) => (
          <details
            key={i}
            className="faq-item group rounded-md border border-[var(--border-subtle)] bg-[var(--surface-2)] open:border-[var(--accent-subtle)]"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[14px] font-medium text-[var(--text-primary)] transition-colors hover:text-[var(--gold)]">
              <span>{item.q}</span>
              <span
                aria-hidden
                className="text-[13px] text-[var(--gold)] transition-transform duration-200 group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="faq-content">
              <div className="px-5 pb-5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                {item.a}
              </div>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
