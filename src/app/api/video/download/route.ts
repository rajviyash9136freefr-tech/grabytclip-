import { NextRequest } from "next/server";
import { fail, toErrorResponse } from "@/lib/errors";
import { downloadQuerySchema } from "@/lib/validate";
import {
  buildVideoDownloadArgs,
  buildAudioDownloadArgs,
  downloadToTempFile,
  fileResponse,
} from "@/lib/youtube";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const parsed = downloadQuerySchema.safeParse({
      url: searchParams.get("url") || undefined,
      videoId: searchParams.get("videoId") ?? "",
      type: searchParams.get("type") ?? "video",
      quality: searchParams.get("quality") ?? undefined,
      format: searchParams.get("format") ?? undefined,
    });

    if (!parsed.success) {
      return fail("VALIDATION_ERROR", "Invalid download parameters", 400);
    }

    const { videoId, type, quality, format } = parsed.data;

    // Rate limit (per IP, stricter for downloads)
    const ip = getClientIp(request);
    const rl = await checkRateLimit(`download:${ip}`, 15, 60_000);
    if (!rl.allowed) {
      return fail("RATE_LIMITED", "Too many downloads. Try again soon.", 429, {
        retryAfterSec: rl.retryAfterSec,
      });
    }

    const abortController = new AbortController();
    request.signal.addEventListener("abort", () => abortController.abort(), {
      once: true,
    });

    // Acquire a concurrency slot + download to disk. Any yt-dlp failure surfaces
    // as a proper error status BEFORE we begin streaming — no 200-with-empty-file.
    const spec =
      type === "audio"
        ? buildAudioDownloadArgs(videoId, format ?? "m4a")
        : buildVideoDownloadArgs(videoId, quality ?? "1080");

    const file = await downloadToTempFile(spec, { signal: abortController.signal });

    // Stream the on-disk file to the client; temp file is cleaned up on completion.
    return fileResponse(file);
  } catch (e) {
    return toErrorResponse(e);
  }
}
