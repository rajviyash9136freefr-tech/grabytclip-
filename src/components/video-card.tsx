"use client";

import type { VideoMetadata } from "@/lib/youtube";
import { CopyButton } from "@/components/copy-button";
import { Badge } from "@/components/ui/badge";
import { formatDuration, formatNumber, hashtagify } from "@/lib/format";

interface VideoCardProps {
  metadata: VideoMetadata;
  onVideoDownload: (quality: string) => string;
  onAudioDownload: (format: string) => string;
  onThumbnailDownload: () => string;
}

export function VideoCard({
  metadata,
  onVideoDownload,
  onAudioDownload,
  onThumbnailDownload,
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

  const hashtags = hashtagify(tags);

  return (
    <div className="animate-slide-up space-y-5">
      {/* ── Thumbnail + meta row ───────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[280px_1fr]">
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden rounded-md bg-[var(--surface-3)]">
          {/* External YouTube image — served as-is via a plain <img> (next/image would
              just re-fetch a non-optimizable 3rd-party CDN asset). */}
          <img
            src={thumbnail}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(e) => {
              // Fallback to hqdefault
              const img = e.target as HTMLImageElement;
              if (!img.dataset.fallback) {
                img.dataset.fallback = "1";
                img.src = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
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
          {qualityOptions.map((q) => (
            <a
              key={q.key}
              href={onVideoDownload(q.key)}
              download
              className={`inline-flex h-9 items-center gap-1.5 rounded-sm px-4 text-[13px] font-medium transition-colors ${
                q.available
                  ? "bg-[var(--surface-3)] text-[var(--text-primary)] hover:bg-[var(--surface-4)] hover:text-[var(--text-primary)] border border-[var(--border-default)]"
                  : "cursor-not-allowed border border-[var(--border-subtle)] bg-transparent text-[var(--text-disabled)]"
              }`}
              onClick={(e) => {
                if (!q.available) e.preventDefault();
              }}
            >
              {q.label}
              {q.filesizeApprox && q.available && (
                <span className="text-[11px] text-[var(--text-tertiary)]">
                  {formatSize(q.filesizeApprox)}
                </span>
              )}
              {!q.available && <span className="text-[11px]">unavailable</span>}
            </a>
          ))}
        </div>
      </div>

      {/* ── Audio quality buttons ──────────────────────── */}
      <div>
        <h3 className="mb-2 text-[13px] font-medium text-[var(--text-primary)]">
          Download Audio
        </h3>
        <div className="flex flex-wrap gap-2">
          {audioOptions.map((a) => (
            <a
              key={a.key}
              href={onAudioDownload(a.key)}
              download
              className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-[var(--border-default)] bg-[var(--surface-3)] px-4 text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-4)]"
            >
              {a.label}
              {a.filesizeApprox && (
                <span className="text-[11px] text-[var(--text-tertiary)]">
                  ~{formatSize(a.filesizeApprox)}
                </span>
              )}
            </a>
          ))}
        </div>
      </div>

      {/* ── Thumbnail download ─────────────────────────── */}
      <div>
        <h3 className="mb-2 text-[13px] font-medium text-[var(--text-primary)]">
          Download Thumbnail
        </h3>
        <a
          href={onThumbnailDownload()}
          download
          className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-[var(--border-default)] bg-[var(--surface-3)] px-4 text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-4)]"
        >
          Thumbnail (JPG)
        </a>
      </div>

      {/* ── Description ────────────────────────────────── */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-[13px] font-medium text-[var(--text-primary)]">
            Description
          </h3>
          <CopyButton text={description} variant="text" label="Copy description" />
        </div>
        <div className="max-h-32 overflow-y-auto rounded-sm border border-[var(--border-subtle)] bg-[var(--surface-1)] p-3 text-[12px] leading-relaxed text-[var(--text-secondary)]">
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
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(0)}KB`;
  if (bytes < 1_000_000_000) return `${(bytes / 1_000_000).toFixed(1)}MB`;
  return `${(bytes / 1_000_000_000).toFixed(1)}GB`;
}
