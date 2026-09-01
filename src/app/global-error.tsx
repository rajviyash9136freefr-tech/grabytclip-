"use client";

import { ErrorSheet } from "@frontend/components/error-sheet";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Root-level error boundary. Catches failures in the root layout itself, so it
 * renders its own <html>/<body> (the layout may have failed to mount). This is
 * the last line of defence after `error.tsx`.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const digest = "digest" in error && error.digest ? error.digest : undefined;

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <div className="flex min-h-screen flex-col bg-[var(--surface-1)]">
          <main className="flex-1">
            <ErrorSheet
              status="500"
              title="Something went wrong"
              message="An unexpected error occurred while loading the app. Please try again."
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
        </div>
      </body>
    </html>
  );
}
