import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  YTDLP_PATH: z.string().default("yt-dlp"),
  DOWNLOAD_TIMEOUT: z.coerce.number().int().positive().default(120),
  MAX_DOWNLOAD_SIZE: z.coerce.number().int().positive().default(1_073_741_824),
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
