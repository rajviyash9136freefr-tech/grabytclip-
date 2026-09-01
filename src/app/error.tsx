"use client";

import { SiteHeader } from "@frontend/components/site-header";
import { SiteFooter } from "@frontend/components/site-footer";
import { ErrorSheet } from "@frontend/components/error-sheet";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Client-component error boundary for the app segment (500). Rendered at the
 * closest segment that threw; `reset` re-renders the segment without a reload.
 */
export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  const digest = "digest" in error && error.digest ? error.digest : undefined;

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <ErrorSheet
          status="500"
          title="Something went wrong"
          message="An unexpected error occurred on our end. Your download wasn't affected — try again, or return to the downloader."
        >
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center gap-2 rounded-sm border border-[var(--border-default)] bg-[var(--surface-3)] px-6 text-[14px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-4)]"
          >
            Try again
          </button>
        </ErrorSheet>
        {digest && (
          <p className="pb-10 text-center text-[11px] text-[var(--text-disabled)]">
            Reference: {digest}
          </p>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
