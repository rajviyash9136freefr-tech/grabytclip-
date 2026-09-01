"use client";

import type { ReactNode } from "react";
import { DownloaderTool } from "@frontend/components/downloader-tool";
import { Card } from "@frontend/components/ui/card";
import { SectionHeading } from "@frontend/components/section-heading";
import { Download, Copy, Music, ImageDown } from "lucide-react";

/**
 * Hero + downloader + "How it works". SEO content sections are passed in via
 * `children` so they can be server-rendered by the page.tsx (keeps them
 * crawlable and out of the client JS bundle).
 */
export function HomeClient({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface-1)]">
      <main className="flex-1">
        {/* ── Hero ──────────────────────────────────── */}
        <section className="relative isolate overflow-hidden">
          {/* butterflies backdrop — screen blend so they glow over the wine surface */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-75 mix-blend-screen"
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

          <div className="mx-auto w-full max-w-[900px] px-4 pb-10 pt-20 text-center sm:pt-24">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/30 bg-[var(--surface-2)]/80 px-4 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--gold)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              Free · No account · Fast
            </span>

            <h1 className="mt-5 font-display text-[40px] font-black leading-[1.05] tracking-[-0.01em] text-[var(--text-primary)] sm:text-[58px]">
              YouTube Video Downloader —{" "}
              <span className="bg-gradient-to-r from-[var(--gold-bright)] via-[var(--gold)] to-[var(--rose)] bg-clip-text text-transparent">
                4K, 2K, 1080p
              </span>{" "}
              &amp; MP3
            </h1>

            <p className="mx-auto mt-5 max-w-[620px] text-[16px] leading-relaxed text-[var(--text-secondary)]">
              Paste any YouTube link and grab the video in your preferred quality, extract
              audio as MP3 or M4A, download the thumbnail, and copy descriptions &amp;
              hashtags — all in one click.
            </p>

            <div className="mt-9">
              <DownloaderTool />
            </div>

            <p className="mx-auto mt-4 max-w-[480px] text-[12px] tracking-wide text-[var(--text-tertiary)]">
              No account · No watermark · Works on all devices
            </p>
          </div>
        </section>

        {/* ── How it works ──────────────────────────── */}
        <section id="how-it-works" className="mx-auto w-full max-w-[900px] px-4 pb-24">
          <SectionHeading
            label="Effortless in four steps"
            heading="How it works"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: <Download className="h-5 w-5" />,
                title: "1. Paste a link",
                desc: "Copy any YouTube video URL and paste it into the field above.",
              },
              {
                icon: <Copy className="h-5 w-5" />,
                title: "2. Pick a quality",
                desc: "Choose from 4K, 2K, 1080p, 720p, or lower — we show you what's available.",
              },
              {
                icon: <Music className="h-5 w-5" />,
                title: "3. Download audio",
                desc: "Extract audio as high-quality M4A or MP3 with one click.",
              },
              {
                icon: <ImageDown className="h-5 w-5" />,
                title: "4. Metadata tools",
                desc: "Grab the thumbnail, copy the description, or copy hashtags instantly.",
              },
            ].map((step, i) => (
              <Card
                key={step.title}
                className="group animate-slide-up p-5 text-center transition-colors duration-200 hover:border-[var(--accent-subtle)]"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--accent-subtle)] bg-gradient-to-b from-[var(--accent-soft)] to-transparent text-[var(--accent)]">
                  {step.icon}
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

        {/* ── Server-rendered SEO content (page.tsx) ── */}
        {children}
      </main>
    </div>
  );
}
