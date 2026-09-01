import type { ReactNode } from "react";
import Link from "next/link";
import { SiteHeader } from "@frontend/components/site-header";
import { SiteFooter } from "@frontend/components/site-footer";

export function PageShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface-1)]">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[800px] flex-1 px-4 py-12">
        <Link
          href="/"
          className="text-[12px] text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
        >
          ← Back to downloader
        </Link>
        <h1 className="mb-6 mt-4 font-display text-[28px] font-bold text-[var(--text-primary)]">
          {title}
        </h1>
        <div className="prose-invert space-y-4 text-[14px] leading-relaxed text-[var(--text-secondary)]">
          {children}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
