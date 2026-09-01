import type { Metadata } from "next";
import { HomeClient } from "@frontend/components/home-client";
import { SiteHeader } from "@frontend/components/site-header";
import { SiteFooter } from "@frontend/components/site-footer";
import { Faq } from "@frontend/components/faq";
import { JsonLd } from "@frontend/components/json-ld";
import { SectionHeading } from "@frontend/components/section-heading";
import { Card } from "@frontend/components/ui/card";
import { Badge } from "@frontend/components/ui/badge";
import Link from "next/link";
import {
  homeFaq,
  faqSchema,
  webAppSchema,
  websiteSchema,
  orgSchema,
  getBaseUrl,
  toolPageList,
} from "@frontend/lib/seo";
import { Film, Music, ImageDown, Hash, Video, Mic } from "lucide-react";

export const metadata: Metadata = {
  title: "YouTube Video Downloader — 4K, 1080p Video & MP3 Audio",
  description:
    "Free YouTube video downloader: download videos in 4K, 2K, 1080p, 720p, 480p or 360p, extract audio as MP3 or M4A, grab HD thumbnails, and copy descriptions & hashtags. No account required.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "YouTube Video Downloader — 4K, 1080p Video & MP3 Audio",
    description:
      "Free YouTube video downloader: download videos in 4K, 2K, 1080p, 720p, 480p or 360p, extract audio as MP3 or M4A, grab HD thumbnails, and copy descriptions & hashtags.",
  },
};

// ── Formats / features grid ──────────────────────────────────────────────

const FORMATS = [
  {
    icon: <Video className="h-5 w-5" />,
    title: "Full videos",
    desc: "4K, 2K, 1080p, 720p, 480p, 360p — whatever the source provides.",
  },
  {
    icon: <Music className="h-5 w-5" />,
    title: "Audio MP3",
    desc: "Extract the audio track as a compatible MP3 file.",
  },
  {
    icon: <Mic className="h-5 w-5" />,
    title: "Audio M4A",
    desc: "Highest-quality AAC audio in an M4A container.",
  },
  {
    icon: <Film className="h-5 w-5" />,
    title: "YouTube Shorts",
    desc: "Download Shorts as MP4 or extract just the audio.",
  },
  {
    icon: <ImageDown className="h-5 w-5" />,
    title: "Thumbnails",
    desc: "Grab the video thumbnail in the best available resolution.",
  },
  {
    icon: <Hash className="h-5 w-5" />,
    title: "Descriptions & hashtags",
    desc: "Copy the full description or all hashtags with one click.",
  },
];

// ── Server component: SEO content sections rendered below the downloader ──

function HomeSeoContent() {
  return (
    <div className="flex flex-col">
      {/* ── What you can download ──────────────────── */}
      <section id="formats" className="mx-auto w-full max-w-[900px] px-4 pb-24">
        <SectionHeading
          label="Everything you need"
          heading="What you can download"
          sub="One tool, six ways to use it — from 4K video to hashtag copy."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FORMATS.map((f) => (
            <Card
              key={f.title}
              as="article"
              className="flex flex-col items-start gap-3 p-5 transition-colors duration-200 hover:border-[var(--accent-subtle)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--accent-subtle)] bg-gradient-to-b from-[var(--accent-soft)] to-transparent text-[var(--accent)]">
                {f.icon}
              </div>
              <h3 className="font-display text-[16px] font-bold text-[var(--text-primary)]">
                {f.title}
              </h3>
              <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
                {f.desc}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Tool cards ─────────────────────────────── */}
      <section id="tools" className="mx-auto w-full max-w-[900px] px-4 pb-24">
        <SectionHeading
          label="Explore our tools"
          heading="YouTube tools"
          sub="Dedicated downloaders for every format and use case."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {toolPageList.map((tool) => (
            <Link key={tool.slug} href={`/${tool.slug}`} className="group block">
              <Card
                as="article"
                className="flex flex-col gap-3 p-5 transition-colors duration-200 hover:border-[var(--accent-subtle)]"
              >
                <h3 className="font-display text-[16px] font-bold text-[var(--text-primary)] group-hover:text-[var(--gold)] transition-colors">
                  {tool.h1}
                </h3>
                <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
                  {tool.description}
                </p>
                <span className="text-[12px] font-medium text-[var(--gold)]">
                  Try it now →
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────── */}
      <Faq items={homeFaq} />

      {/* ── Download guide ─────────────────────────── */}
      <section id="guide" className="mx-auto w-full max-w-[760px] px-4 pb-24">
        <SectionHeading
          label="Tips & tricks"
          heading="Download guide"
          sub="Everything you need to get the most out of grabytclip."
        />

        <div className="space-y-6 text-[14px] leading-relaxed text-[var(--text-secondary)]">
          <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-2)] p-5">
            <h3 className="mb-2 font-display text-[16px] font-bold text-[var(--text-primary)]">
              Why use grabytclip?
            </h3>
            <p className="mb-2">
              grabytclip is built for speed and simplicity. Unlike many online
              downloaders, we do not require accounts, set no tracking cookies, and never
              store your files on our servers. Everything is streamed directly to you and
              discarded immediately.
            </p>
            <p>
              We support all common YouTube URL formats — regular videos, Shorts, music
              uploads, and live streams. The downloader works on any device with a modern
              browser, from desktops to phones.
            </p>
          </div>

          <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-2)] p-5">
            <h3 className="mb-2 font-display text-[16px] font-bold text-[var(--text-primary)]">
              Tips for the best results
            </h3>
            <ul className="space-y-2">
              <li>
                <Badge variant="accent" className="mr-2">
                  Quality
                </Badge>
                Choose the highest resolution you need — 4K for large screens, 1080p or
                720p for everyday use.
              </li>
              <li>
                <Badge variant="accent" className="mr-2">
                  Audio
                </Badge>
                Pick M4A for the best sound quality, or MP3 for maximum device
                compatibility.
              </li>
              <li>
                <Badge variant="accent" className="mr-2">
                  Shorts
                </Badge>
                YouTube Shorts links work exactly like regular video links — paste and
                download.
              </li>
              <li>
                <Badge variant="accent" className="mr-2">
                  Metadata
                </Badge>
                Use the copy tools to grab the description or hashtags before you navigate
                away.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Page component ───────────────────────────────────────────────────────

export default function HomePage() {
  const baseUrl = getBaseUrl();

  return (
    <>
      {/* JSON-LD structured data */}
      <JsonLd id="ld-webapp" data={webAppSchema()} />
      <JsonLd id="ld-website" data={websiteSchema()} />
      <JsonLd id="ld-org" data={orgSchema()} />
      <JsonLd id="ld-faq" data={faqSchema(homeFaq)} />
      <JsonLd
        id="ld-breadcrumb"
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
          ],
        }}
      />

      <SiteHeader />
      <HomeClient>
        <HomeSeoContent />
      </HomeClient>
      <SiteFooter />
    </>
  );
}
