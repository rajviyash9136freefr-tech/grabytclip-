import { ImageResponse } from "next/og";

// edge runtime is not supported by the Cloudflare Workers adapter (OpenNext).
// ImageResponse also works in the default (nodejs) runtime on Next.js 15.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg, #1A0A0F 0%, #12060A 100%)",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="7" fill="#E7C873" />
          <path d="M9 7.5v9l7.5-4.5L9 7.5Z" fill="#1A0A0F" />
        </svg>
        <span
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "#FFF8ED",
            letterSpacing: "-0.02em",
          }}
        >
          grabytclip
        </span>
      </div>
      <span
        style={{
          fontSize: 28,
          color: "#DCC8B4",
          maxWidth: 700,
          textAlign: "center",
          lineHeight: 1.4,
        }}
      >
        Download YouTube videos in 4K, 2K, 1080p · Extract audio · Grab thumbnails
      </span>
    </div>,
    { ...size },
  );
}
