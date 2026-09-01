import type { ReactNode } from "react";
import Link from "next/link";
import { Ornament } from "@frontend/components/section-heading";

interface ErrorSheetProps {
  /** Human-readable status, e.g. "404". */
  status: string;
  title: string;
  message: string;
  /** Optional client-only actions (e.g. a reset button). */
  children?: ReactNode;
}

/**
 * Shared image for custom error pages (404 / 500) — matches the Crimson & Gold
 * hero treatment with the butterflies backdrop. Purely presentational so it can
 * be used from a server `not-found.tsx`, a client `error.tsx`, and a
 * self-contained `global-error.tsx`.
 */
export function ErrorSheet({ status, title, message, children }: ErrorSheetProps) {
  return (
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

      <div className="mx-auto flex w-full max-w-[760px] flex-col items-center px-4 py-28 text-center sm:py-36">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/30 bg-[var(--surface-2)]/80 px-4 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--gold)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          Error {status}
        </span>

        <h1 className="mt-6 font-display text-[76px] font-black leading-none tracking-[-0.02em] text-[var(--text-primary)] sm:text-[110px]">
          <span className="bg-gradient-to-r from-[var(--gold-bright)] via-[var(--gold)] to-[var(--rose)] bg-clip-text text-transparent">
            {status}
          </span>
        </h1>

        <p className="mt-4 font-display text-[24px] font-bold text-[var(--text-primary)] sm:text-[28px]">
          {title}
        </p>
        <p className="mx-auto mt-3 max-w-[480px] text-[14px] leading-relaxed text-[var(--text-secondary)]">
          {message}
        </p>

        <Ornament />

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-2 rounded-sm bg-[var(--accent)] px-6 text-[14px] font-medium text-[var(--on-accent)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            Go to home page
          </Link>
          {children}
        </div>
      </div>
    </section>
  );
}
