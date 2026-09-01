"use client";

import { useEffect } from "react";
import { Button } from "@frontend/components/ui/button";

interface DownloadConfirmDialogProps {
  open: boolean;
  /** Video title, shown as the dialog heading. */
  title: string;
  /** Rows of key detail about the download, e.g. [["Quality","1080p"],["Format","MP4"]]. */
  details: Array<[string, string]>;
  /** Estimated file size label, e.g. "~120 MB". */
  sizeLabel: string;
  /** Whether the option is a high-resolution that will be re-encoded to H.264. */
  willConvert: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation dialog shown before a download starts. Native <dialog> so it's
 * focus-trapped and dismissible with Escape. Client component.
 */
export function DownloadConfirmDialog({
  open,
  title,
  details,
  sizeLabel,
  willConvert,
  onConfirm,
  onCancel,
}: DownloadConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm download"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Cancel"
        onClick={onCancel}
        className="absolute inset-0 cursor-default bg-[var(--surface-overlay)]"
      />

      <div className="relative w-full max-w-[420px] rounded-md border border-[var(--border-subtle)] bg-[var(--surface-2)] p-6 shadow-lg">
        <h3 className="font-display text-[17px] font-bold leading-tight text-[var(--text-primary)] line-clamp-2">
          {title}
        </h3>

        <dl className="mt-4 space-y-2">
          {details.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4">
              <dt className="text-[12px] uppercase tracking-wide text-[var(--text-disabled)]">
                {k}
              </dt>
              <dd className="text-[13px] font-medium text-[var(--text-primary)]">{v}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-4">
            <dt className="text-[12px] uppercase tracking-wide text-[var(--text-disabled)]">
              Size
            </dt>
            <dd className="text-[13px] font-medium text-[var(--text-primary)]">
              {sizeLabel}
            </dd>
          </div>
        </dl>

        {willConvert && (
          <p className="mt-4 rounded-sm border border-[var(--accent-subtle)] bg-[var(--accent-subtle)]/40 px-3 py-2 text-[12px] leading-relaxed text-[var(--text-secondary)]">
            This quality is converted to a playable MP4 (H.264) so it works everywhere —
            it may take a little longer to prepare.
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" size="md" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="accent" size="md" onClick={onConfirm}>
            Download
          </Button>
        </div>
      </div>
    </div>
  );
}
