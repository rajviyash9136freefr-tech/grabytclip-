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

export function formatFileSize(bytes: number): string {
  if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(0)} KB`;
  if (bytes < 1_000_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
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
