"use client";

import { useState } from "react";
import Link from "next/link";
import { UrlForm } from "@/components/url-form";
import { VideoCard } from "@/components/video-card";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { buildDownloadUrl, buildThumbnailUrl } from "@/lib/format";
import type { VideoMetadata } from "@/lib/youtube";
import { ShieldAlert, Download, Music, Copy, ImageDown } from "lucide-react";

export function HomeClient() {
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (url: string) => {
    setIsLoading(true);
    setError(null);
    setMetadata(null);
    try {
      const res = await fetch("/api/video/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = (await res.json()) as
        { data: VideoMetadata } | { error: { message: string } };
      if (!res.ok || !("data" in json)) {
        const msg = "error" in json ? json.error.message : "Something went wrong";
        setError(msg);
        return;
      }
      setMetadata(json.data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface-1)]">
      <Header />

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

          <div className="mx-auto w-full max-w-[900px] px-4 pb-4 pt-20 text-center sm:pt-24">
            <SectionLabel>Free · No account · Fast</SectionLabel>

            <h1 className="mt-5 font-display text-[40px] font-black leading-[1.05] tracking-[-0.01em] text-[var(--text-primary)] sm:text-[58px]">
              Download YouTube videos —{" "}
              <span className="bg-gradient-to-r from-[var(--gold-bright)] via-[var(--gold)] to-[var(--rose)] bg-clip-text text-transparent">
                4K, 2K, 1080p
              </span>{" "}
              &amp; more
            </h1>

            <p className="mx-auto mt-5 max-w-[620px] text-[16px] leading-relaxed text-[var(--text-secondary)]">
              Paste any YouTube link and grab the video in your preferred quality, extract
              audio as MP3 or M4A, download the thumbnail, and copy descriptions &amp;
              hashtags — all in one click.
            </p>

            <Ornament />

            <div className="mx-auto mt-9 max-w-[640px]">
              <UrlForm onSubmit={handleSubmit} isLoading={isLoading} />
            </div>

            <p className="mx-auto mt-4 max-w-[480px] text-[12px] tracking-wide text-[var(--text-tertiary)]">
              No account · No watermark · Works on all devices
            </p>
          </div>
        </section>

        {/* ── Results ───────────────────────────────── */}
        <section className="mx-auto w-full max-w-[900px] px-4 pb-16">
          {isLoading && (
            <Card className="animate-slide-up p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[280px_1fr]">
                <Skeleton className="aspect-video rounded-md" />
                <div className="space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2 pt-2">
                    {[0, 1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-9 w-20" />
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {error && (
            <Card className="animate-slide-up border-[var(--danger)] p-5">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[var(--danger)]" />
                <div>
                  <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
                    Could not load video
                  </h3>
                  <p className="mt-1 text-[13px] text-[var(--text-secondary)]">{error}</p>
                  <p className="mt-2 text-[12px] text-[var(--text-tertiary)]">
                    Check the link and try again. Some videos are private, region-locked,
                    or require sign-in.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {metadata && !isLoading && (
            <VideoCard
              metadata={metadata}
              onVideoDownload={(quality) =>
                buildDownloadUrl(metadata.id, "video", quality)
              }
              onAudioDownload={(format) =>
                buildDownloadUrl(metadata.id, "audio", undefined, format)
              }
              onThumbnailDownload={() => buildThumbnailUrl(metadata.id)}
            />
          )}
        </section>

        {/* ── How it works ──────────────────────────── */}
        <section id="how-it-works" className="mx-auto w-full max-w-[900px] px-4 pb-24">
          <div className="mb-10 flex flex-col items-center text-center">
            <SectionLabel>Effortless in four steps</SectionLabel>
            <h2 className="mt-4 font-display text-[30px] font-black text-[var(--text-primary)] sm:text-[38px]">
              How it works
            </h2>
            <Ornament />
          </div>

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
      </main>

      <Footer />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/30 bg-[var(--surface-2)]/80 px-4 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--gold)]">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
      {children}
    </span>
  );
}

function Ornament() {
  return (
    <div className="mx-auto mt-6 flex items-center justify-center gap-3 text-[var(--gold)]/70">
      <span className="h-px w-14 bg-gradient-to-r from-transparent to-[var(--gold)]/60" />
      <span className="text-[14px] leading-none">✦</span>
      <span className="h-px w-14 bg-gradient-to-l from-transparent to-[var(--gold)]/60" />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-[var(--z-raised)] border-b border-[var(--border-subtle)] bg-[var(--surface-1)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo />
          <span className="font-display text-[18px] font-bold tracking-tight text-[var(--text-primary)]">
            grabytclip
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-[13px] text-[var(--text-tertiary)]">
          <Link
            href="/#how-it-works"
            className="transition-colors hover:text-[var(--gold)]"
          >
            How it works
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-[var(--gold)]">
            Privacy
          </Link>
          <Link href="/terms" className="transition-colors hover:text-[var(--gold)]">
            Terms
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--surface-1)]">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10">
        <div className="flex flex-col items-center justify-between gap-5 sm:flex-row">
          <div className="flex items-center gap-2.5 text-[12px] text-[var(--text-tertiary)]">
            <Logo size={18} />
            <span>grabytclip © {new Date().getFullYear()}</span>
          </div>
          <nav className="flex items-center gap-6 text-[12px] text-[var(--text-tertiary)]">
            <Link href="/about" className="transition-colors hover:text-[var(--gold)]">
              About
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-[var(--gold)]">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-[var(--gold)]">
              Terms of Service
            </Link>
            <Link
              href="/disclaimer"
              className="transition-colors hover:text-[var(--gold)]"
            >
              Disclaimer
            </Link>
          </nav>
        </div>
        <div className="mx-auto mt-7 flex max-w-[720px] items-center justify-center gap-3">
          <span className="h-px w-full bg-gradient-to-r from-transparent to-[var(--gold)]/40" />
          <span className="text-[12px] text-[var(--gold)]/70">✦</span>
          <span className="h-px w-full bg-gradient-to-l from-transparent to-[var(--gold)]/40" />
        </div>
        <p className="mt-5 text-center text-[11px] leading-relaxed text-[var(--text-disabled)] sm:text-left">
          grabytclip is an independent tool and is not affiliated with, endorsed by, or
          sponsored by YouTube or Google. Please respect copyright and only download
          content you have the right to use.
        </p>
      </div>
    </footer>
  );
}

function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect width="24" height="24" rx="7" fill="url(#lg)" />
      <path d="M9 7.5v9l7.5-4.5L9 7.5Z" fill="var(--on-accent)" />
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="24" y2="24">
          <stop offset="0%" stopColor="var(--gold-bright)" />
          <stop offset="100%" stopColor="var(--gold)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
