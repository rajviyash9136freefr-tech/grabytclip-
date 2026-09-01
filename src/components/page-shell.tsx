import type { ReactNode } from "react";
import Link from "next/link";

export function PageShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface-1)]">
      <header className="border-b border-[var(--border-subtle)]">
        <div className="mx-auto flex h-14 w-full max-w-[800px] items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
            <span className="font-display text-[16px] font-bold text-[var(--text-primary)]">
              grabytclip
            </span>
          </Link>
          <Link
            href="/"
            className="text-[13px] text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
          >
            ← Back to downloader
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[800px] flex-1 px-4 py-12">
        <h1 className="mb-6 font-display text-[28px] font-bold text-[var(--text-primary)]">
          {title}
        </h1>
        <div className="prose-invert space-y-4 text-[14px] leading-relaxed text-[var(--text-secondary)]">
          {children}
        </div>
      </main>

      <footer className="border-t border-[var(--border-subtle)]">
        <div className="mx-auto flex max-w-[800px] items-center justify-between px-4 py-6 text-[12px] text-[var(--text-tertiary)]">
          <span>grabytclip © {new Date().getFullYear()}</span>
          <nav className="flex gap-4">
            <Link href="/about" className="hover:text-[var(--text-primary)]">
              About
            </Link>
            <Link href="/privacy" className="hover:text-[var(--text-primary)]">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[var(--text-primary)]">
              Terms
            </Link>
            <Link href="/disclaimer" className="hover:text-[var(--text-primary)]">
              Disclaimer
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="var(--accent)" />
      <path d="M9 7.5v9l7.5-4.5L9 7.5Z" fill="var(--on-accent)" />
    </svg>
  );
}
