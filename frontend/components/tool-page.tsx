import type { ToolPageConfig } from "@frontend/lib/seo";
import { getBaseUrl, faqSchema, webAppSchema, breadcrumbSchema } from "@frontend/lib/seo";
import { SiteHeader } from "@frontend/components/site-header";
import { SiteFooter } from "@frontend/components/site-footer";
import { DownloaderTool } from "@frontend/components/downloader-tool";
import { Faq } from "@frontend/components/faq";
import { JsonLd } from "@frontend/components/json-ld";
import { SectionHeading } from "@frontend/components/section-heading";
import { Card } from "@frontend/components/ui/card";
import { Check } from "lucide-react";

/**
 * Shared layout for a tool landing page: SEO hero + downloader + steps +
 * features + FAQ + JSON-LD. Content comes from a `ToolPageConfig`.
 */
export function ToolPage({ tool }: { tool: ToolPageConfig }) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/${tool.slug}`;

  return (
    <>
      <JsonLd
        id="ld-breadcrumb"
        data={breadcrumbSchema([
          { name: "Home", url: baseUrl },
          { name: tool.h1, url },
        ])}
      />
      <JsonLd
        id="ld-webapp"
        data={webAppSchema({
          name: tool.h1,
          description: tool.description,
          url,
        })}
      />
      <JsonLd id="ld-faq" data={faqSchema(tool.faq)} />

      <SiteHeader />

      <main className="flex-1">
        {/* ── Hero ──────────────────────────────────── */}
        <section className="relative isolate overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-50 mix-blend-screen"
            style={{
              backgroundImage: "url(/butterflies.svg)",
              backgroundSize: "cover",
              backgroundPosition: "center 46%",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_60%_at_50%_45%,transparent_0%,var(--surface-1)_100%)]"
          />

          <div className="mx-auto w-full max-w-[820px] px-4 pb-10 pt-20 text-center sm:pt-24">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/30 bg-[var(--surface-2)]/80 px-4 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--gold)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              Free · No account · Fast
            </span>

            <h1 className="mt-5 font-display text-[38px] font-black leading-[1.08] tracking-[-0.01em] text-[var(--text-primary)] sm:text-[52px]">
              {tool.h1}
            </h1>

            <div className="mx-auto mt-5 max-w-[620px] space-y-4">
              {tool.intro.map((p, i) => (
                <p
                  key={i}
                  className="text-[15px] leading-relaxed text-[var(--text-secondary)]"
                >
                  {p}
                </p>
              ))}
            </div>

            <div className="mt-9">
              <DownloaderTool />
            </div>
          </div>
        </section>

        {/* ── How to use ────────────────────────────── */}
        <section id="how-it-works" className="mx-auto w-full max-w-[900px] px-4 pb-24">
          <SectionHeading label="Three easy steps" heading="How to use" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {tool.steps.map((step, i) => (
              <Card
                key={step.title}
                className="group animate-slide-up p-5 text-center transition-colors duration-200 hover:border-[var(--accent-subtle)]"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--accent-subtle)] bg-gradient-to-b from-[var(--accent-soft)] to-transparent text-[var(--accent)]">
                  {i + 1}
                </div>
                <h3 className="font-display text-[16px] font-bold text-[var(--text-primary)]">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                  {step.desc}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* ── Features ──────────────────────────────── */}
        <section className="mx-auto w-full max-w-[900px] px-4 pb-24">
          <SectionHeading label="Why you will love it" heading="Features" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {tool.features.map((feature) => (
              <Card
                key={feature.title}
                as="article"
                className="flex items-start gap-3 p-5 transition-colors duration-200 hover:border-[var(--accent-subtle)]"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-subtle)] text-[var(--gold)]">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h3 className="font-display text-[15px] font-bold text-[var(--text-primary)]">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                    {feature.desc}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────── */}
        <Faq items={tool.faq} heading="Frequently asked questions" />
      </main>

      <SiteFooter />
    </>
  );
}
