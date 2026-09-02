"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { VideoMetadata } from "@backend/lib/youtube";
import { CopyButton } from "@frontend/components/copy-button";
import { Badge } from "@frontend/components/ui/badge";
import { Spinner } from "@frontend/components/ui/spinner";
import { DownloadConfirmDialog } from "@frontend/components/download-confirm-dialog";
import {
  formatDuration,
  formatNumber,
  hashtagify,
  formatFileSize,
  formatSpeed,
} from "@frontend/lib/format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JobState {
  jobId: string;
  status: string;
  percent: number;
  downloadedBytes: number;
  totalBytes: number | null;
  expectedBytes?: number;
  speed: number | null;
  eta: number | null;
  error?: string;
}

/** A download option the user clicked, pending confirmation. */
interface PendingOption {
  optionKey: string;
  type: "video" | "audio";
  quality?: string;
  format?: string;
  label: string;
  sizeLabel: string;
  /** High-resolution video options are re-encoded to H.264 for compatibility. */
  willConvert: boolean;
}

// ---------------------------------------------------------------------------
// VideoCard component
// ---------------------------------------------------------------------------

interface VideoCardProps {
  metadata: VideoMetadata;
  onThumbnailDownload?: () => string;
}

export function VideoCard({
  metadata,
  onThumbnailDownload: _onThumbnailDownload,
}: VideoCardProps) {
  const {
    id,
    title,
    channel,
    description,
    tags,
    durationSec,
    viewCount,
    likeCount,
    uploadDate,
    thumbnail,
    qualityOptions,
    audioOptions,
  } = metadata;

  // High-res sources (2K/4K/Best) are re-encoded to H.264/AAC for playback.
  const isHighRes = (q: string) => q === "best" || Number(q) >= 1440;

  const [jobs, setJobs] = useState<Record<string, JobState>>({});
  const [pending, setPending] = useState<PendingOption | null>(null);
  const intervals = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const hashtags = hashtagify(tags);

  // Cleanup intervals on unmount
  useEffect(() => {
    const currentIntervals = intervals.current;
    return () => {
      for (const key of Object.keys(currentIntervals)) {
        clearInterval(currentIntervals[key]!);
      }
    };
  }, []);

  const startJob = useCallback(
    async (
      optionKey: string,
      type: "video" | "audio",
      quality?: string,
      format?: string,
      expectedBytes?: number,
    ) => {
      try {
        const res = await fetch("/api/video/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoId: id,
            type,
            quality,
            format,
            expectedBytes:
              typeof expectedBytes === "number" && expectedBytes > 0
                ? expectedBytes
                : undefined,
            durationSec:
              typeof durationSec === "number" && durationSec > 0
                ? durationSec
                : undefined,
          }),
        });
        const json = (await res.json()) as
          | {
              data: {
                jobId: string;
                job?: {
                  status?: string;
                  streamUrl?: string;
                  filename?: string;
                  percent?: number;
                };
              };
            }
          | { error: { message: string } };

        if (!res.ok || !("data" in json)) {
          const msg = "error" in json ? json.error.message : "Job creation failed";
          setJobs((prev) => ({
            ...prev,
            [optionKey]: {
              jobId: "error",
              status: "error",
              percent: 0,
              downloadedBytes: 0,
              totalBytes: null,
              speed: null,
              eta: null,
              error: msg,
            },
          }));
          return;
        }

        const { jobId, job } = json.data;

        // If serverless resolved streamUrl immediately:
        if (job?.status === "ready" && job.streamUrl) {
          setJobs((prev) => ({
            ...prev,
            [optionKey]: {
              jobId,
              status: "ready",
              percent: 100,
              downloadedBytes: 0,
              totalBytes: null,
              speed: null,
              eta: null,
            },
          }));

          const a = document.createElement("a");
          a.href = job.streamUrl;
          if (job.filename) a.download = job.filename;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          return;
        }

        // Initial state
        setJobs((prev) => ({
          ...prev,
          [optionKey]: {
            jobId,
            status: "pending",
            percent: 0,
            downloadedBytes: 0,
            totalBytes: expectedBytes ?? null,
            speed: null,
            eta: null,
          },
        }));

        // Poll progress — poll once immediately so fast downloads start without a lag,
        // then continue on a 1s interval until ready/error.
        const poll = async () => {
          try {
            const pollRes = await fetch(`/api/video/download/job/${jobId}`);
            if (!pollRes.ok) {
              clearInterval(intervals.current[optionKey]!);
              delete intervals.current[optionKey];
              setJobs((prev) => ({
                ...prev,
                [optionKey]: {
                  jobId,
                  status: "error",
                  percent: 0,
                  downloadedBytes: 0,
                  totalBytes: null,
                  speed: null,
                  eta: null,
                  error: "Failed to fetch progress",
                },
              }));
              return;
            }
            const pollJson = (await pollRes.json()) as {
              data: {
                status: string;
                percent: number;
                downloadedBytes: number;
                totalBytes: number | null;
                speedBytesPerSec: number | null;
                etaSec: number | null;
                errorMessage?: string;
              };
            };
            const { data: d } = pollJson;

            if (d.status === "ready") {
              clearInterval(intervals.current[optionKey]!);
              delete intervals.current[optionKey];
              // Navigate to the file to start the download
              window.location.href = `/api/video/download/file/${jobId}`;
              return;
            }

            if (d.status === "error") {
              clearInterval(intervals.current[optionKey]!);
              delete intervals.current[optionKey];
              setJobs((prev) => ({
                ...prev,
                [optionKey]: {
                  jobId,
                  status: "error",
                  percent: 0,
                  downloadedBytes: 0,
                  totalBytes: null,
                  speed: null,
                  eta: null,
                  error: d.errorMessage ?? "Download failed",
                },
              }));
              return;
            }

            setJobs((prev) => ({
              ...prev,
              [optionKey]: {
                jobId,
                status: d.status,
                percent: d.percent,
                downloadedBytes: d.downloadedBytes,
                totalBytes: d.totalBytes,
                speed: d.speedBytesPerSec,
                eta: d.etaSec,
              },
            }));
          } catch {
            clearInterval(intervals.current[optionKey]!);
            delete intervals.current[optionKey];
          }
        };
        void poll();
        intervals.current[optionKey] = setInterval(poll, 1000);
      } catch {
        setJobs((prev) => ({
          ...prev,
          [optionKey]: {
            jobId: "error",
            status: "error",
            percent: 0,
            downloadedBytes: 0,
            totalBytes: null,
            speed: null,
            eta: null,
            error: "Network error. Try again.",
          },
        }));
      }
    },
    [id, durationSec],
  );

  const cancelJob = async (optionKey: string) => {
    if (intervals.current[optionKey]) {
      clearInterval(intervals.current[optionKey]!);
      delete intervals.current[optionKey];
    }
    const job = jobs[optionKey];
    if (job?.jobId) {
      try {
        await fetch(`/api/video/download/job/${job.jobId}`, { method: "DELETE" });
      } catch {
        // ignore
      }
    }
    setJobs((prev) => {
      const next = { ...prev };
      delete next[optionKey];
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Top row: thumbnail + metadata ──────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        {/* Thumbnail */}
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-sm bg-[var(--surface-3)] sm:w-64 sm:rounded-md">
          <img
            src={thumbnail}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
            onLoad={(e) => {
              const img = e.target as HTMLImageElement;
              if (
                img.naturalWidth <= 120 &&
                img.naturalHeight <= 90 &&
                !img.dataset.fallback
              ) {
                img.dataset.fallback = "1";
                img.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
              }
            }}
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              if (!img.dataset.fallback) {
                img.dataset.fallback = "1";
                img.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
              } else {
                img.src = "";
                img.alt = "Thumbnail unavailable";
              }
            }}
          />
          {durationSec > 0 && (
            <span className="absolute bottom-1.5 right-1.5 rounded-sm bg-black/80 px-1.5 py-0.5 text-[11px] font-medium leading-none text-white">
              {formatDuration(durationSec)}
            </span>
          )}
        </div>

        {/* Meta */}
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="font-display text-[18px] font-semibold leading-tight text-[var(--text-primary)] line-clamp-2">
            {title}
          </h2>
          <p className="text-[13px] text-[var(--text-secondary)]">{channel}</p>
          <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-[var(--text-tertiary)]">
            {viewCount > 0 && <span>{formatNumber(viewCount)} views</span>}
            {uploadDate !== "Unknown" && (
              <>
                <span className="text-[var(--text-disabled)]">·</span>
                <span>{uploadDate}</span>
              </>
            )}
          </div>
          {likeCount != null && (
            <p className="text-[12px] text-[var(--text-tertiary)]">
              👍 {formatNumber(likeCount)} likes
            </p>
          )}
        </div>
      </div>

      {/* ── Video quality buttons ──────────────────────── */}
      <div>
        <h3 className="mb-2 text-[13px] font-medium text-[var(--text-primary)]">
          Download Video
        </h3>
        <div className="flex flex-wrap gap-2">
          {qualityOptions.map((q) => {
            const optionKey = `video-${q.key}`;
            const job = jobs[optionKey];

            if (job && job.status !== "error") {
              return (
                <DownloadProgressCard
                  key={optionKey}
                  job={job}
                  optionKey={optionKey}
                  onCancel={cancelJob}
                />
              );
            }

            return (
              <button
                key={optionKey}
                disabled={!q.available}
                onClick={() => {
                  if (q.available) {
                    setPending({
                      optionKey,
                      type: "video",
                      quality: q.key,
                      label: q.label,
                      sizeLabel: q.filesizeApprox
                        ? `~${formatFileSize(q.filesizeApprox)}`
                        : "—",
                      willConvert: isHighRes(q.key),
                    });
                  }
                }}
                className={`inline-flex h-9 items-center gap-1.5 rounded-sm px-4 text-[13px] font-medium transition-colors ${
                  q.available
                    ? "cursor-pointer border border-[var(--border-default)] bg-[var(--surface-3)] text-[var(--text-primary)] hover:bg-[var(--surface-4)] hover:text-[var(--text-primary)]"
                    : "cursor-not-allowed border border-[var(--border-subtle)] bg-transparent text-[var(--text-disabled)]"
                }`}
              >
                {q.label}
                {q.filesizeApprox && q.available && (
                  <span className="text-[11px] text-[var(--text-tertiary)]">
                    ~{formatFileSize(q.filesizeApprox)}
                  </span>
                )}
                {!q.available && <span className="text-[11px]">unavailable</span>}
              </button>
            );
          })}
        </div>
        {/* Error states for video jobs */}
        {Object.entries(jobs).map(([key, job]) =>
          job.status === "error" && key.startsWith("video-") ? (
            <p key={key} className="mt-1 text-[11px] text-[var(--danger)]">
              {key.replace("video-", "")}: {job.error}
            </p>
          ) : null,
        )}
      </div>

      {/* ── Audio quality buttons ──────────────────────── */}
      <div>
        <h3 className="mb-2 text-[13px] font-medium text-[var(--text-primary)]">
          Download Audio
        </h3>
        <div className="flex flex-wrap gap-2">
          {audioOptions.map((a) => {
            const optionKey = `audio-${a.key}`;
            const job = jobs[optionKey];

            if (job && job.status !== "error") {
              return (
                <DownloadProgressCard
                  key={optionKey}
                  job={job}
                  optionKey={optionKey}
                  onCancel={cancelJob}
                />
              );
            }

            return (
              <button
                key={optionKey}
                onClick={() => {
                  setPending({
                    optionKey,
                    type: "audio",
                    format: a.key,
                    label: a.label,
                    sizeLabel: a.filesizeApprox
                      ? `~${formatFileSize(a.filesizeApprox)}`
                      : "—",
                    willConvert: false,
                  });
                }}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-sm border border-[var(--border-default)] bg-[var(--surface-3)] px-4 text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-4)]"
              >
                {a.label}
                {a.filesizeApprox && (
                  <span className="text-[11px] text-[var(--text-tertiary)]">
                    ~{formatFileSize(a.filesizeApprox)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {/* Error states for audio jobs */}
        {Object.entries(jobs).map(([key, job]) =>
          job.status === "error" && key.startsWith("audio-") ? (
            <p key={key} className="mt-1 text-[11px] text-[var(--danger)]">
              {key.replace("audio-", "")}: {job.error}
            </p>
          ) : null,
        )}
      </div>

      {/* ── Thumbnail download ─────────────────────────── */}
      <div>
        <h3 className="mb-2 text-[13px] font-medium text-[var(--text-primary)]">
          Download Thumbnail
        </h3>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/video/thumbnail?videoId=${id}&size=4k`}
            download
            className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-[var(--border-default)] bg-[var(--surface-3)] px-4 text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-4)]"
          >
            4K
          </a>
          <a
            href={`/api/video/thumbnail?videoId=${id}&size=2k`}
            download
            className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-[var(--border-default)] bg-[var(--surface-3)] px-4 text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-4)]"
          >
            2K
          </a>
          <a
            href={`/api/video/thumbnail?videoId=${id}&size=1080p`}
            download
            className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-[var(--border-default)] bg-[var(--surface-3)] px-4 text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-4)]"
          >
            1080p
          </a>
        </div>
      </div>

      {/* ── Description ────────────────────────────────── */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-[13px] font-medium text-[var(--text-primary)]">
            Description
          </h3>
          <CopyButton text={description} variant="text" label="Copy description" />
        </div>
        <div className="custom-scrollbar max-h-32 overflow-y-auto rounded-sm border border-[var(--border-subtle)] bg-[var(--surface-1)] p-3 text-[12px] leading-relaxed text-[var(--text-secondary)]">
          {description || "No description available."}
        </div>
      </div>

      {/* ── Hashtags ───────────────────────────────────── */}
      {tags.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-[13px] font-medium text-[var(--text-primary)]">
              Hashtags
            </h3>
            <CopyButton text={hashtags} variant="text" label="Copy hashtags" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Badge key={tag} variant="accent">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* ── Confirmation dialog ─────────────────────────── */}
      <DownloadConfirmDialog
        open={pending !== null}
        title={title}
        details={
          pending
            ? ([
                ["Type", pending.type === "video" ? "Video" : "Audio"],
                ...(pending.type === "video" && pending.quality !== "best"
                  ? [["Quality", pending.label] as [string, string]]
                  : []),
                ...(pending.quality === "best"
                  ? [["Quality", "Best available"] as [string, string]]
                  : []),
                [
                  "Format",
                  pending.type === "video"
                    ? "MP4"
                    : (pending.format?.toUpperCase() ?? ""),
                ],
              ].filter((row) => row[1]) as Array<[string, string]>)
            : []
        }
        sizeLabel={pending?.sizeLabel ?? "—"}
        willConvert={pending?.willConvert ?? false}
        onConfirm={() => {
          if (pending) {
            void startJob(
              pending.optionKey,
              pending.type,
              pending.quality,
              pending.format,
              pending.type === "video"
                ? qualityOptions.find((q) => q.key === pending.quality)?.filesizeApprox
                : audioOptions.find((a) => a.key === pending.format)?.filesizeApprox,
            );
          }
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Download-progress sub-component
// ---------------------------------------------------------------------------

function DownloadProgressCard({
  job,
  optionKey,
  onCancel,
}: {
  job: JobState;
  optionKey: string;
  onCancel: (optionKey: string) => void;
}) {
  const barPercent = Math.min(
    100,
    Math.max(job.status === "ready" ? 100 : 5, job.percent),
  );
  const downloadedFormatted = formatFileSize(job.downloadedBytes || 0);

  const statusLabel =
    job.status === "ready"
      ? "Done"
      : job.status === "converting"
        ? "Optimizing…"
        : job.status === "merging"
          ? "Merging…"
          : `${barPercent}%`;

  return (
    <div
      key={optionKey}
      className="inline-flex h-9 min-w-[200px] items-center justify-between gap-2 rounded-sm border border-[var(--accent)]/60 bg-[var(--surface-2)] px-2.5 text-[12px] text-[var(--text-primary)] shadow-sm"
    >
      {/* Progress bar + label */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {job.status !== "ready" ? (
          <Spinner className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
        ) : (
          <span className="text-[12px]">✅</span>
        )}

        <div className="relative h-2 min-w-[50px] flex-1 overflow-hidden rounded-full bg-[var(--surface-4)]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300"
            style={{ width: `${barPercent}%` }}
          />
        </div>

        <span className="shrink-0 font-medium tabular-nums text-[var(--text-primary)] text-[11px]">
          {statusLabel}
        </span>
      </div>

      {/* Speed or MB stats */}
      {job.speed && job.speed > 0 && job.status !== "ready" ? (
        <span className="hidden shrink-0 text-[10px] font-medium text-[var(--accent)] sm:inline tabular-nums">
          {formatSpeed(job.speed)}
        </span>
      ) : (
        <span className="hidden shrink-0 text-[10px] text-[var(--text-tertiary)] sm:inline tabular-nums">
          {downloadedFormatted}
        </span>
      )}

      {/* Mid-time Cancel (✕) button */}
      {job.status !== "ready" && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCancel(optionKey);
          }}
          title="Cancel download"
          className="group -mr-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-[var(--text-tertiary)] transition-colors hover:bg-[var(--danger)]/20 hover:text-[var(--danger)]"
          aria-label="Cancel download"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
