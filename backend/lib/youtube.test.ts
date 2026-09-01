import { describe, it, expect } from "vitest";
import {
  sanitizeFilename,
  buildVideoDownloadArgs,
  buildAudioDownloadArgs,
  estimateBytes,
  parseProgressLine,
  codecsArePlayable,
} from "@backend/lib/youtube";

describe("sanitizeFilename", () => {
  it("strips path-dangerous and control characters", () => {
    expect(sanitizeFilename('a/b\\c:d*e?f"g<h>i|j')).toBe("a b c d e f g h i j");
    expect(sanitizeFilename("hello world")).toBe("hello world");
    expect(sanitizeFilename("   ")).toBe("video");
    expect(sanitizeFilename("")).toBe("video");
  });

  it("collapses whitespace and truncates to 120 chars", () => {
    expect(sanitizeFilename("a  b   c")).toBe("a b c");
    expect(sanitizeFilename("x".repeat(300)).length).toBe(120);
  });
});

describe("estimateBytes", () => {
  const dur = 60;

  it("uses exact filesize first", () => {
    expect(estimateBytes(500, null, null, dur)).toBe(500);
  });

  it("falls back to filesizeApprox", () => {
    expect(estimateBytes(null, 400, null, dur)).toBe(400);
    expect(estimateBytes(undefined, 400, undefined, dur)).toBe(400);
  });

  it("falls back to tbr × duration / 8", () => {
    // tbr=1000 kbps, dur=60s → 1000*1000/8*60 = 7_500_000
    expect(estimateBytes(null, null, 1000, dur)).toBe(7_500_000);
  });

  it("prefers filesize over all others", () => {
    expect(estimateBytes(100, 200, 300, dur)).toBe(100);
  });

  it("returns undefined when no data", () => {
    expect(estimateBytes(null, null, null, 0)).toBeUndefined();
    expect(estimateBytes(undefined, undefined, undefined, 0)).toBeUndefined();
  });

  it("returns undefined when tbr is zero", () => {
    expect(estimateBytes(null, null, 0, 60)).toBeUndefined();
  });
});

describe("parseProgressLine", () => {
  it("parses a valid progress line", () => {
    const p = parseProgressLine("downloading|1000|50000|NA|2500000|12");
    expect(p).not.toBeNull();
    expect(p!.status).toBe("downloading");
    expect(p!.downloadedBytes).toBe(1000);
    expect(p!.totalBytes).toBe(50000);
    expect(p!.totalBytesEstimate).toBeNull();
    expect(p!.speedBytesPerSec).toBe(2_500_000);
    expect(p!.etaSec).toBe(12);
  });

  it("parses NA fields as null", () => {
    const p = parseProgressLine("downloading|0|NA|80000|NA|NA");
    expect(p).not.toBeNull();
    expect(p!.totalBytes).toBeNull();
    expect(p!.totalBytesEstimate).toBe(80000);
    expect(p!.speedBytesPerSec).toBeNull();
    expect(p!.etaSec).toBeNull();
  });

  it("parses a finished line", () => {
    const p = parseProgressLine("finished|8390921|8390921|NA|992918|0");
    expect(p).not.toBeNull();
    expect(p!.status).toBe("finished");
    expect(p!.downloadedBytes).toBe(8390921);
    expect(p!.etaSec).toBe(0);
  });

  it("returns null for non-progress lines", () => {
    expect(parseProgressLine("ERROR: something happened")).toBeNull();
    expect(parseProgressLine('[Merger] Merging formats into "file.mp4"')).toBeNull();
    expect(parseProgressLine("[youtube] Downloading webpage")).toBeNull();
  });

  it("handles empty input", () => {
    expect(parseProgressLine("")).toBeNull();
  });
});

describe("buildVideoDownloadArgs", () => {
  it("builds a selector with exact-height and fallback (height<=1080)", () => {
    const spec = buildVideoDownloadArgs("dQw4w9WgXcQ", "1080");
    expect(spec.args).toContain("--merge-output-format");
    expect(spec.args).toContain("mp4");
    expect(spec.args).toContain("--concurrent-fragments");
    expect(spec.videoId).toBe("dQw4w9WgXcQ");
    expect(spec.filename).toContain("-1080p.mp4");
    expect(spec.contentType).toBe("video/mp4");
    // The selector must contain both exact-height and ≤-height branches
    const fIdx = spec.args.indexOf("-f");
    const selector = spec.args[fIdx + 1];
    expect(selector).toContain("height=1080");
    expect(selector).toContain("height<=1080");
  });

  it("builds a 'best' selector without height filters", () => {
    const spec = buildVideoDownloadArgs("dQw4w9WgXcQ", "best");
    const fIdx = spec.args.indexOf("-f");
    const selector = spec.args[fIdx + 1];
    expect(selector).toContain("bestvideo");
    expect(selector).toContain("bestaudio");
    expect(spec.filename).toContain("-best.mp4");
  });

  it("is safe against command injection — no shell metachars reach spawn args from the selector", () => {
    // Even a hostile-looking quality string cannot inject: the selector is built from
    // Number(quality), so non-numeric input becomes NaN (safe). "best" is handled specially.
    const spec = buildVideoDownloadArgs("dQw4w9WgXcQ", "; rm -rf /");
    expect(spec.args.some((a) => a.includes("rm -rf"))).toBe(false);
  });
});

describe("buildAudioDownloadArgs", () => {
  it("builds mp3 args with transcode flag and concurrent fragments", () => {
    const spec = buildAudioDownloadArgs("dQw4w9WgXcQ", "mp3");
    expect(spec.args).toContain("-x");
    expect(spec.args).toContain("--audio-format");
    expect(spec.args).toContain("mp3");
    expect(spec.args).toContain("--concurrent-fragments");
    expect(spec.contentType).toBe("audio/mpeg");
  });

  it("builds m4a args by default", () => {
    const spec = buildAudioDownloadArgs("dQw4w9WgXcQ", "m4a");
    expect(spec.args).toContain("bestaudio[ext=m4a]/bestaudio");
    expect(spec.args).toContain("--concurrent-fragments");
    expect(spec.contentType).toBe("audio/mp4");
  });
});
describe("codecsArePlayable", () => {
  it("accepts H.264 video + AAC audio (the universally-playable combo)", () => {
    expect(codecsArePlayable({ videoCodec: "h264", audioCodec: "aac" })).toBe(true);
  });

  it("rejects VP9/AV1 video or Opus audio (not Windows-Media-Player friendly)", () => {
    expect(codecsArePlayable({ videoCodec: "av1", audioCodec: "opus" })).toBe(false);
    expect(codecsArePlayable({ videoCodec: "vp9", audioCodec: "opus" })).toBe(false);
    expect(codecsArePlayable({ videoCodec: "vp09.00.41.08", audioCodec: "aac" })).toBe(
      false,
    );
    expect(codecsArePlayable({ videoCodec: "h264", audioCodec: "opus" })).toBe(false);
  });

  it("rejects when a stream is missing (e.g. audio-only or unknown)", () => {
    expect(codecsArePlayable({ videoCodec: null, audioCodec: "aac" })).toBe(false);
    expect(codecsArePlayable({ videoCodec: "h264", audioCodec: null })).toBe(false);
  });
});
