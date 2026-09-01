import { NextRequest } from "next/server";
import { fail, toErrorResponse } from "@backend/lib/errors";
import { checkRateLimit, getClientIp } from "@backend/lib/rate-limit";

export const dynamic = "force-dynamic";

const YT_IMG_HOSTS = new Set(["img.youtube.com", "i.ytimg.com"]);

/** Read image dimensions from the leading bytes (JPEG SOF / PNG IHDR). */
function imageSize(buf: Uint8Array): { width: number; height: number } | null {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (
    buf.length >= 24 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
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
      const len = view.getUint16(i + 2);
      if (marker === 0xc0 || marker === 0xc2 || marker === 0xc1 || marker === 0xc3) {
        return { height: view.getUint16(i + 5), width: view.getUint16(i + 7) };
      }
      i += 2 + len;
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const videoId = request.nextUrl.searchParams.get("videoId");
    const requestedSize = (request.nextUrl.searchParams.get("size") || request.nextUrl.searchParams.get("quality") || "maxres").toLowerCase();

    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return fail("VALIDATION_ERROR", "Invalid video ID", 400);
    }

    const ip = getClientIp(request);
    const rl = await checkRateLimit(`thumb:${ip}`);
    if (!rl.allowed) {
      return fail("RATE_LIMITED", "Too many requests. Try again soon.", 429);
    }

    let candidates: string[];
    if (requestedSize === "4k" || requestedSize === "maxres" || requestedSize === "1080") {
      candidates = ["maxresdefault.jpg", "sddefault.jpg", "hqdefault.jpg"];
    } else if (requestedSize === "2k" || requestedSize === "sd" || requestedSize === "720" || requestedSize === "480") {
      candidates = ["sddefault.jpg", "hqdefault.jpg", "maxresdefault.jpg"];
    } else if (requestedSize === "hd" || requestedSize === "hq" || requestedSize === "360") {
      candidates = ["hqdefault.jpg", "sddefault.jpg", "mqdefault.jpg"];
    } else if (requestedSize === "medium" || requestedSize === "mq" || requestedSize === "180") {
      candidates = ["mqdefault.jpg", "hqdefault.jpg", "default.jpg"];
    } else {
      candidates = ["maxresdefault.jpg", "sddefault.jpg", "hqdefault.jpg"];
    }

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

        const arrayBuf = await res.arrayBuffer();
        const buf = new Uint8Array(arrayBuf);
        const dims = imageSize(buf);

        // Placeholder is 120x90; skip if it's the gray placeholder
        if (dims && dims.width === 120 && dims.height === 90 && candidates.indexOf(name) < candidates.length - 1) {
          continue;
        }

        return new Response(arrayBuf, {
          headers: {
            "Content-Type": "image/jpeg",
            "Content-Disposition": `attachment; filename="grabytclip-thumbnail-${videoId}-${requestedSize}.jpg"`,
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
