import { z } from "zod";

/** Extract a canonical YouTube video ID from various URL forms. */
export function extractYoutubeId(input: string): string | null {
  const patterns = [
    // youtu.be/<id>
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})(?:\?.*)?$/,
    // youtube.com/watch?v=<id>
    /(?:https?:\/\/)?(?:www\.|m\.|music\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    // youtube.com/shorts/<id>
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    // youtube.com/embed/<id>
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    // youtube.com/v/<id>
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    // youtube.com/live/<id>
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match?.[1]) return match[1];
  }

  // If it's a bare 11-char video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

  return null;
}

export const videoUrlSchema = z
  .string()
  .min(1, "Enter a YouTube URL or video ID")
  .max(2048)
  .refine(
    (v) => {
      // Allow bare IDs
      if (/^[a-zA-Z0-9_-]{11}$/.test(v)) return true;
      // Must be http(s)
      try {
        const url = new URL(v.startsWith("http") ? v : `https://${v}`);
        const host = url.hostname.toLowerCase();
        return (
          host === "youtube.com" ||
          host === "www.youtube.com" ||
          host === "m.youtube.com" ||
          host === "music.youtube.com" ||
          host === "youtu.be" ||
          host === "www.youtu.be" ||
          host.endsWith(".youtube.com")
        );
      } catch {
        return false;
      }
    },
    { message: "Only YouTube URLs are supported" },
  )
  .refine((v) => extractYoutubeId(v) !== null, {
    message: "Could not extract a video ID from this URL",
  })
  .transform((v) => {
    // extractYoutubeId is guaranteed non-null by the refine above, so the transform
    // never throws — which keeps safeParse returning a clean 400, not a 500.
    const id = extractYoutubeId(v)!;
    return { url: `https://www.youtube.com/watch?v=${id}`, videoId: id };
  });

const YT_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

// Download is video-ID-driven (the URL is reconstructed server-side), so `url` is
// accepted but not required — keeping it optional avoids implying a URL is ever fetched.
export const downloadQuerySchema = z.object({
  url: z.string().url().optional(),
  videoId: z.string().regex(YT_ID_REGEX, "Invalid video ID"),
  type: z.enum(["video", "audio"]),
  quality: z.string().optional(),
  format: z.string().optional(),
});
