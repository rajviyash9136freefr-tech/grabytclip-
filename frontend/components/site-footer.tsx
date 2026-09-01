import Link from "next/link";
import { Logo } from "@frontend/components/logo";

const GROUPS: Array<{ title: string; links: Array<{ href: string; label: string }> }> = [
  {
    title: "YouTube tools",
    links: [
      { href: "/", label: "YouTube Video Downloader" },
      { href: "/youtube-to-mp4", label: "YouTube to MP4" },
      { href: "/youtube-to-mp3", label: "YouTube to MP3" },
      { href: "/youtube-shorts-downloader", label: "YouTube Shorts Downloader" },
      { href: "/youtube-thumbnail-downloader", label: "YouTube Thumbnail Downloader" },
    ],
  },
  {
    title: "Features",
    links: [
      { href: "/#formats", label: "Video qualities" },
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#faq", label: "FAQ" },
      { href: "/#tools", label: "All tools" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About us" },
      { href: "/contact", label: "Contact us" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms & Conditions" },
      { href: "/disclaimer", label: "Disclaimer" },
    ],
  },
];

/** Rich site footer with internal link groups (vidssave-style cross-linking). */
export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--surface-1)]">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <Logo size={22} />
              <span className="font-display text-[16px] font-bold text-[var(--text-primary)]">
                grabytclip
              </span>
            </div>
            <p className="mt-4 max-w-[280px] text-[12px] leading-relaxed text-[var(--text-tertiary)]">
              A free, no-account YouTube downloader and metadata toolkit. Download videos
              in 4K, extract audio, grab thumbnails, and copy descriptions and hashtags.
            </p>
          </div>

          {GROUPS.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h3 className="mb-4 text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--text-disabled)]">
                {group.title}
              </h3>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-[var(--text-tertiary)] transition-colors hover:text-[var(--gold)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 border-t border-[var(--border-subtle)] pt-6">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <span className="text-[12px] text-[var(--text-tertiary)]">
              grabytclip © {new Date().getFullYear()}
            </span>
            <span className="text-[12px] text-[var(--gold)]/50">✦</span>
          </div>
          <p className="mt-5 text-center text-[11px] leading-relaxed text-[var(--text-disabled)] sm:text-left">
            grabytclip is an independent tool and is not affiliated with, endorsed by, or
            sponsored by YouTube or Google. Please respect copyright and only download
            content you have the right to use.
          </p>
        </div>
      </div>
    </footer>
  );
}
