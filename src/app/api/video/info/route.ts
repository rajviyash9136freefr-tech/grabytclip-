import { NextRequest } from "next/server";
import { ok, toErrorResponse } from "@backend/lib/errors";
import { videoUrlSchema } from "@backend/lib/validate";
import { fetchMetadata } from "@backend/lib/serverless-youtube";
import { checkRateLimit, getClientIp } from "@backend/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Rate limit (per IP)
    const ip = getClientIp(request);
    const rl = await checkRateLimit(`info:${ip}`);
    if (!rl.allowed) {
      return Response.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests. Try again soon.",
            details: { retryAfterSec: rl.retryAfterSec },
          },
        },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    // Parse body
    let raw: { url?: unknown };
    try {
      raw = (await request.json()) as { url?: unknown };
    } catch {
      return Response.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } },
        { status: 400 },
      );
    }

    if (typeof raw.url !== "string" || !raw.url.trim()) {
      return Response.json(
        { error: { code: "VALIDATION_ERROR", message: "Missing 'url' in request body" } },
        { status: 400 },
      );
    }

    const parsed = videoUrlSchema.safeParse(raw.url.trim());
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Invalid YouTube URL";
      return Response.json(
        { error: { code: "VALIDATION_ERROR", message: msg } },
        { status: 400 },
      );
    }

    const { url, videoId } = parsed.data;

    // Fetch metadata via serverless edge extractor
    const metadata = await fetchMetadata(url);

    return ok({ videoId, ...metadata });
  } catch (e) {
    return toErrorResponse(e);
  }
}
