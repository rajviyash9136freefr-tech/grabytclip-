import Link from "next/link";
import { Logo } from "@frontend/components/logo";

const NAV = [
  { href: "/youtube-to-mp4", label: "YouTube to MP4" },
  { href: "/youtube-to-mp3", label: "YouTube to MP3" },
  { href: "/youtube-shorts-downloader", label: "Shorts" },
  { href: "/youtube-thumbnail-downloader", label: "Thumbnail" },
];

/** Site-wide sticky nav. Server component — links are crawlable. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-[var(--z-raised)] border-b border-[var(--border-subtle)] bg-[var(--surface-1)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Logo />
          <span className="font-display text-[18px] font-bold tracking-tight text-[var(--text-primary)]">
            grabytclip
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--text-tertiary)]">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="transition-colors hover:text-[var(--gold)]">
              {item.label}
            </Link>
          ))}
          <Link href="/about" className="transition-colors hover:text-[var(--gold)]">
            About
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-[var(--gold)]">
            Privacy
          </Link>
          <Link href="/terms" className="transition-colors hover:text-[var(--gold)]">
            Terms
          </Link>
          <Link href="/contact" className="transition-colors hover:text-[var(--gold)]">
            Contact
          </Link>
        </nav>
      </div>
    </header>
  );
}
