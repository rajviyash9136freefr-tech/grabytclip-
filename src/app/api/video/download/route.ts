import { NextRequest } from "next/server";
import { fail, ok, toErrorResponse } from "@backend/lib/errors";
import { downloadQuerySchema, createDownloadSchema } from "@backend/lib/validate";
import { resolveServerlessDownload } from "@backend/lib/serverless-youtube";
import { createJob, toJobView } from "@backend/lib/download-jobs";
import { checkRateLimit, getClientIp } from "@backend/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Create a download job and return its id immediately; progress is polled separately. */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await checkRateLimit(`create:${ip}`, 30, 60_000);
    if (!rl.allowed) {
      return fail("RATE_LIMITED", "Too many download requests. Try again soon.", 429, {
        retryAfterSec: rl.retryAfterSec,
      });
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return fail("VALIDATION_ERROR", "Invalid JSON body", 400);
    }

    const parsed = createDownloadSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid download parameters",
        400,
      );
    }

    const { videoId, type, quality, format, expectedBytes, durationSec } = parsed.data;
    const abortController = new AbortController();
    request.signal.addEventListener("abort", () => abortController.abort(), {
      once: true,
    });

    const job = await createJob({
      videoId,
      type,
      quality,
      format,
      ip,
      expectedBytes: expectedBytes ?? undefined,
      durationSec: durationSec ?? undefined,
      signal: abortController.signal,
    });

    return ok({ jobId: job.id, job: toJobView(job) });
  } catch (e) {
    return toErrorResponse(e);
  }
}

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

    const ip = getClientIp(request);
    const rl = await checkRateLimit(`download:${ip}`, 30, 60_000);
    if (!rl.allowed) {
      return fail("RATE_LIMITED", "Too many downloads. Try again soon.", 429, {
        retryAfterSec: rl.retryAfterSec,
      });
    }

    const abortController = new AbortController();
    request.signal.addEventListener("abort", () => abortController.abort(), {
      once: true,
    });

    const result = await resolveServerlessDownload({
      videoId,
      type,
      quality,
      format,
      signal: abortController.signal,
    });

    // 302 Redirect directly to the CDN stream URL
    return Response.redirect(result.streamUrl, 302);
  } catch (e) {
    return toErrorResponse(e);
  }
}
