import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .default("https://grabytclip.rajviyash9136freefr.workers.dev"),
  YOUTUBE_API_KEY: z
    .string()
    .optional()
    .default("AIzaSyA9udT55qjCwXEflckeAS1SjkLLFbXU5KQ"),
  YTDLP_PATH: z.string().default("yt-dlp"),
  // ffmpeg / ffprobe used to guarantee playable H.264/AAC output for high-res sources
  // (YouTube serves 2K/4K as VP9/AV1, which Windows Media Player cannot decode).
  FFMPEG_PATH: z.string().default("ffmpeg"),
  FFPROBE_PATH: z.string().default("ffprobe"),
  DOWNLOAD_TIMEOUT: z.coerce.number().int().positive().default(120),
  // Re-encoding high-res (VP9/AV1 → H.264) is CPU-bound and can take several minutes
  // for a 4K file, so it gets its own generous timeout (separate from DOWNLOAD_TIMEOUT).
  CONVERT_TIMEOUT: z.coerce.number().int().positive().default(1800),
  MAX_DOWNLOAD_SIZE: z.coerce.number().int().positive().default(1_073_741_824),
  // Concurrent DASH fragment downloads (yt-dlp `--concurrent-fragment-downloads`).
  // High-res video streams are fragmented; pulling several at once massively speeds up 4K/2K.
  DOWNLOAD_FRAGMENTS: z.coerce.number().int().min(1).max(16).default(4),
  // How long a finished download job (and its temp file) is kept before cleanup.
  DOWNLOAD_JOB_TTL_MS: z.coerce.number().int().positive().default(1_800_000),
  RATE_LIMIT_REQUESTS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
});

function parseEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (e) {
    if (e instanceof z.ZodError) {
      const missing = e.issues.map((i) => i.path.join(".")).join(", ");
      throw new Error(`Environment validation failed: ${missing}`);
    }
    throw e;
  }
}

export const env = parseEnv();
