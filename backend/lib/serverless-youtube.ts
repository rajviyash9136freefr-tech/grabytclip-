import { AppError } from "@backend/lib/errors";

// ---------------------------------------------------------------------------
// Types (compatible with existing frontend components)
// ---------------------------------------------------------------------------

export interface RawFormat {
  format_id: string;
  ext?: string;
  height?: number;
  width?: number;
  fps?: number;
  vcodec?: string;
  acodec?: string;
  filesize?: number;
  filesize_approx?: number;
  format_note?: string;
  tbr?: number;
  format?: string;
}

export interface VideoFormat {
  formatId: string;
  ext: string;
  height?: number;
  width?: number;
  fps?: number;
  vcodec: string;
  acodec: string;
  filesize?: number;
  filesizeApprox?: number;
  formatNote?: string;
  tbr?: number;
  hasVideo: boolean;
  hasAudio: boolean;
}

export interface QualityOption {
  key: string;
  label: string;
  height: number;
  ext: string;
  contentType: string;
  filesizeApprox?: number;
  available: boolean;
}

export interface AudioOption {
  key: string;
  label: string;
  ext: string;
  contentType: string;
  filesizeApprox?: number;
}

export interface VideoMetadata {
  id: string;
  title: string;
  description: string;
  tags: string[];
  channel: string;
  channelId: string;
  durationSec: number;
  viewCount: number;
  likeCount: number | null;
  uploadDate: string;
  thumbnail: string;
  formats: VideoFormat[];
  qualityOptions: QualityOption[];
  audioOptions: AudioOption[];
  maxHeight: number;
  isLive: boolean;
}

const QUALITY_TIERS: Array<{
  key: string;
  label: string;
  height: number;
  bitrateMultiplier: number;
}> = [
  { key: "best", label: "Best", height: Infinity, bitrateMultiplier: 5500 },
  { key: "2160", label: "4K", height: 2160, bitrateMultiplier: 12000 },
  { key: "1440", label: "2K", height: 1440, bitrateMultiplier: 7000 },
  { key: "1080", label: "1080p", height: 1080, bitrateMultiplier: 3500 },
  { key: "720", label: "720p", height: 720, bitrateMultiplier: 1800 },
  { key: "480", label: "480p", height: 480, bitrateMultiplier: 900 },
  { key: "360", label: "360p", height: 360, bitrateMultiplier: 500 },
];

// ---------------------------------------------------------------------------
// Serverless Metadata Extractor (Pure HTTP / Edge-compatible)
// ---------------------------------------------------------------------------

export async function fetchMetadata(
  urlOrId: string,
  signal?: AbortSignal,
): Promise<VideoMetadata> {
  const videoId = extractVideoId(urlOrId);
  if (!videoId) {
    throw new AppError("VALIDATION_ERROR", "Invalid YouTube video ID or URL", 400);
  }

  // Attempt 1: Fetch YouTube video page for rich details (duration, channel, view count)
  try {
    const pageData = await fetchYouTubePageData(videoId, signal);
    if (pageData) return pageData;
  } catch (e) {
    // Continue to fallback
  }

  // Attempt 2: YouTube oEmbed API (Guaranteed reliable, fast, public)
  try {
    const oembedData = await fetchYouTubeOembed(videoId, signal);
    if (oembedData) return oembedData;
  } catch (e) {
    // Continue to fallback
  }

  // Attempt 3: Generate standard metadata from Video ID
  return generateFallbackMetadata(videoId);
}

export function extractVideoId(input: string): string | null {
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  const match = input.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
  );
  return match && match[1] ? match[1] : null;
}

interface YouTubeVideoDetails {
  title?: string;
  author?: string;
  channelId?: string;
  lengthSeconds?: string;
  viewCount?: string;
  isLiveContent?: boolean;
  shortDescription?: string;
  keywords?: string[];
}

async function fetchYouTubePageData(
  videoId: string,
  signal?: AbortSignal,
): Promise<VideoMetadata | null> {
  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal,
  });

  if (!res.ok) return null;
  const html = await res.text();

  // Extract ytInitialPlayerResponse JSON
  const match = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});(?:var\s|window\[|<)/s);
  if (!match || !match[1]) return null;

  let playerResponse: {
    videoDetails?: YouTubeVideoDetails;
    microformat?: { playerMicroformatRenderer?: { uploadDate?: string } };
  };
  try {
    playerResponse = JSON.parse(match[1]);
  } catch {
    return null;
  }

  const details = playerResponse.videoDetails;
  if (!details || !details.title) return null;

  const durationSec = parseInt(details.lengthSeconds || "0", 10) || 0;
  const viewCount = parseInt(details.viewCount || "0", 10) || 0;
  const isLive = Boolean(details.isLiveContent);
  const uploadDate =
    playerResponse.microformat?.playerMicroformatRenderer?.uploadDate?.slice(0, 10) ||
    "Unknown";

  const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  const bestAudioSize =
    durationSec > 0 ? Math.round(((128 * 1000) / 8) * durationSec) : undefined;

  const qualityOptions: QualityOption[] = QUALITY_TIERS.map((tier) => {
    const estimatedSize =
      durationSec > 0
        ? Math.round(((tier.bitrateMultiplier * 1000) / 8) * durationSec)
        : undefined;

    return {
      key: tier.key,
      label: tier.label,
      height: tier.height === Infinity ? 1080 : tier.height,
      ext: "mp4",
      contentType: "video/mp4",
      filesizeApprox: estimatedSize,
      available: true,
    };
  });

  const audioOptions: AudioOption[] = [
    {
      key: "m4a",
      label: "M4A (best quality)",
      ext: "m4a",
      contentType: "audio/mp4",
      filesizeApprox: bestAudioSize,
    },
    {
      key: "mp3",
      label: "MP3",
      ext: "mp3",
      contentType: "audio/mpeg",
      filesizeApprox: bestAudioSize,
    },
  ];

  return {
    id: videoId,
    title: details.title,
    description: details.shortDescription || "",
    tags: details.keywords || [],
    channel: details.author || "YouTube Creator",
    channelId: details.channelId || "",
    durationSec,
    viewCount,
    likeCount: null,
    uploadDate,
    thumbnail,
    formats: [],
    qualityOptions,
    audioOptions,
    maxHeight: 1080,
    isLive,
  };
}

async function fetchYouTubeOembed(
  videoId: string,
  signal?: AbortSignal,
): Promise<VideoMetadata | null> {
  const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  const res = await fetch(oembedUrl, { signal });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    title?: string;
    author_name?: string;
    author_url?: string;
    thumbnail_url?: string;
  };

  if (!data.title) return null;

  return generateFallbackMetadata(videoId, {
    title: data.title,
    channel: data.author_name,
    thumbnail: data.thumbnail_url,
  });
}

function generateFallbackMetadata(
  videoId: string,
  overrides?: { title?: string; channel?: string; thumbnail?: string },
): VideoMetadata {
  const qualityOptions: QualityOption[] = QUALITY_TIERS.map((tier) => ({
    key: tier.key,
    label: tier.label,
    height: tier.height === Infinity ? 1080 : tier.height,
    ext: "mp4",
    contentType: "video/mp4",
    filesizeApprox: undefined,
    available: true,
  }));

  const audioOptions: AudioOption[] = [
    {
      key: "m4a",
      label: "M4A (best quality)",
      ext: "m4a",
      contentType: "audio/mp4",
      filesizeApprox: undefined,
    },
    {
      key: "mp3",
      label: "MP3",
      ext: "mp3",
      contentType: "audio/mpeg",
      filesizeApprox: undefined,
    },
  ];

  return {
    id: videoId,
    title: overrides?.title || `YouTube Video (${videoId})`,
    description: "",
    tags: [],
    channel: overrides?.channel || "YouTube Channel",
    channelId: "",
    durationSec: 0,
    viewCount: 0,
    likeCount: null,
    uploadDate: "Unknown",
    thumbnail:
      overrides?.thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    formats: [],
    qualityOptions,
    audioOptions,
    maxHeight: 1080,
    isLive: false,
  };
}

// ---------------------------------------------------------------------------
// Serverless Download Stream Resolver (Cobalt API Multi-Instance Engine)
// ---------------------------------------------------------------------------

const COBALT_INSTANCES = [
  "https://api.cobalt.tools",
  "https://cobalt.api.scav.top",
  "https://api.wuk.sh",
  "https://cobalt-api.kwiatekm.tokyo",
  "https://cobalt-api.hyper.lol",
];

export interface ServerlessDownloadResult {
  streamUrl: string;
  filename: string;
  contentType: string;
}

export async function resolveServerlessDownload(opts: {
  videoId: string;
  type: "video" | "audio";
  quality?: string;
  format?: string;
  signal?: AbortSignal;
}): Promise<ServerlessDownloadResult> {
  const { videoId, type, quality = "1080", format = "mp3", signal } = opts;
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const cobaltPayload = {
    url: youtubeUrl,
    videoQuality: quality === "best" ? "max" : quality,
    downloadMode: type === "audio" ? "audio" : "auto",
    audioFormat: format === "mp3" ? "mp3" : "m4a",
    youtubeVideoCodec: "h264",
  };

  let lastError: string = "All extraction providers were temporarily busy.";

  for (const instance of COBALT_INSTANCES) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12_000);
      if (signal) {
        signal.addEventListener("abort", () => controller.abort(), { once: true });
      }

      const res = await fetch(`${instance}/`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": "grabytclip/1.0 (Cloudflare Worker Edge)",
        },
        body: JSON.stringify(cobaltPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        lastError = `Provider ${instance} returned status ${res.status}`;
        continue;
      }

      const data = (await res.json()) as {
        status?: string;
        url?: string;
        filename?: string;
        text?: string;
        picker?: Array<{ url: string; type?: string }>;
      };

      if (data.status === "error") {
        lastError = data.text || "Failed to process download";
        continue;
      }

      const streamUrl =
        data.url ||
        (data.status === "picker" && data.picker && data.picker[0]?.url) ||
        null;

      if (streamUrl) {
        const ext = type === "audio" ? (format === "mp3" ? "mp3" : "m4a") : "mp4";
        const filename =
          data.filename ||
          `grabytclip-${videoId}-${type === "video" ? quality + "p" : format}.${ext}`;
        const contentType =
          type === "audio"
            ? format === "mp3"
              ? "audio/mpeg"
              : "audio/mp4"
            : "video/mp4";

        return {
          streamUrl,
          filename,
          contentType,
        };
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      continue;
    }
  }

  throw new AppError(
    "PROVIDER_ERROR",
    `Could not generate download link (${lastError}). Please try again in a few moments.`,
    502,
  );
}
