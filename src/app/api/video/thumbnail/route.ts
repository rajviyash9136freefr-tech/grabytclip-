import { NextRequest } from "next/server";
import { fail, toErrorResponse } from "@/lib/errors";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const YT_IMG_HOSTS = new Set(["img.youtube.com", "i.ytimg.com"]);

/** Read image dimensions from the leading bytes (JPEG SOF / PNG IHDR). */
function imageSize(buf: Buffer): { width: number; height: number } | null {
  // PNG: IHDR is 8-byte sig + 4 len + 'IHDR' + width(4) + height(4)
  if (
    buf.length >= 24 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // JPEG: walk markers until SOF0(0xC0)/SOF2(0xC2)
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1]!;
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      const len = buf.readUInt16BE(i + 2);
      if (marker === 0xc0 || marker === 0xc2 || marker === 0xc1 || marker === 0xc3) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const videoId = request.nextUrl.searchParams.get("videoId");
    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return fail("VALIDATION_ERROR", "Invalid video ID", 400);
    }

    const ip = getClientIp(request);
    const rl = await checkRateLimit(`thumb:${ip}`);
    if (!rl.allowed) {
      return fail("RATE_LIMITED", "Too many requests. Try again soon.", 429);
    }

    // Try best-quality first; if a candidate is the 120x90 gray YouTube placeholder
    // (returned with HTTP 200 for videos without a high-res thumbnail), fall back.
    const candidates = ["maxresdefault.jpg", "sddefault.jpg", "hqdefault.jpg"];

    for (const name of candidates) {
      const url = `https://img.youtube.com/vi/${videoId}/${name}`;
      try {
        const res = await fetch(url, {
          signal: AbortSignal.timeout(10_000),
          headers: { "User-Agent": "grabytclip/1.0 (+https://grabytclip.com)" },
          redirect: "follow",
        });
        const finalHost = new URL(res.url).hostname;
        if (!YT_IMG_HOSTS.has(finalHost) || !(res.ok || res.status === 404)) {
          continue;
        }
        if (!res.ok) continue;

        const buf = Buffer.from(await res.arrayBuffer());
        const dims = imageSize(buf);

        // Placeholder is 120x90; higher-res candidates are the real thumbnail.
        if (dims && dims.width === 120 && dims.height === 90) {
          continue;
        }

        return new Response(buf, {
          headers: {
            "Content-Type": "image/jpeg",
            "Content-Disposition": `attachment; filename="grabytclip-thumbnail-${videoId}.jpg"`,
            "Cache-Control": "public, max-age=86400",
          },
        });
      } catch {
        // try next candidate
      }
    }

    return fail("NOT_FOUND", "Thumbnail not found", 404);
  } catch (e) {
    return toErrorResponse(e);
  }
}
