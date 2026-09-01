export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function hashtagify(tags: string[]): string {
  if (tags.length === 0) return "";
  return tags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ");
}

/** Format file size in binary units (matches Chrome and OS download manager). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Format transfer rate in binary units, e.g. 4_200_000 → "4.0 MB/s". */
export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${bytesPerSec} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
  if (bytesPerSec < 1024 * 1024 * 1024)
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  return `${(bytesPerSec / (1024 * 1024 * 1024)).toFixed(2)} GB/s`;
}

/** Format remaining-time estimate in seconds, e.g. 83 → "1:23". */
export function formatEta(seconds: number): string {
  if (seconds < 0) return "—";
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function buildDownloadUrl(
  videoId: string,
  type: "video" | "audio",
  quality?: string,
  format?: string,
): string {
  const params = new URLSearchParams({
    videoId,
    type,
    url: `https://www.youtube.com/watch?v=${videoId}`,
  });
  if (quality) params.set("quality", quality);
  if (format) params.set("format", format);
  return `/api/video/download?${params.toString()}`;
}

export function buildThumbnailUrl(videoId: string): string {
  return `/api/video/thumbnail?videoId=${videoId}`;
}
