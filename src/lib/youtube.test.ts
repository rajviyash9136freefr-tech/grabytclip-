import { describe, it, expect } from "vitest";
import {
  sanitizeFilename,
  buildVideoDownloadArgs,
  buildAudioDownloadArgs,
} from "@/lib/youtube";

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

describe("buildVideoDownloadArgs", () => {
  it("builds a selector with a height cap and merge-to-mp4", () => {
    const spec = buildVideoDownloadArgs("dQw4w9WgXcQ", "1080");
    expect(spec.args).toContain("--merge-output-format");
    expect(spec.args).toContain("mp4");
    expect(spec.videoId).toBe("dQw4w9WgXcQ");
    expect(spec.filename).toContain("-1080p.mp4");
    expect(spec.contentType).toBe("video/mp4");
    // The height filter must be present in the selector
    const fIdx = spec.args.indexOf("-f");
    const selector = spec.args[fIdx + 1];
    expect(selector).toContain("height<=1080");
  });

  it("is safe against command injection — no shell metachars reach spawn args from the selector", () => {
    // Even a hostile-looking quality string cannot inject: the selector is built from
    // Number(quality), so non-numeric input becomes NaN (safe).
    const spec = buildVideoDownloadArgs("dQw4w9WgXcQ", "; rm -rf /");
    expect(spec.args.some((a) => a.includes("rm -rf"))).toBe(false);
  });
});

describe("buildAudioDownloadArgs", () => {
  it("builds mp3 args with transcode flag", () => {
    const spec = buildAudioDownloadArgs("dQw4w9WgXcQ", "mp3");
    expect(spec.args).toContain("-x");
    expect(spec.args).toContain("--audio-format");
    expect(spec.args).toContain("mp3");
    expect(spec.contentType).toBe("audio/mpeg");
  });

  it("builds m4a args by default", () => {
    const spec = buildAudioDownloadArgs("dQw4w9WgXcQ", "m4a");
    expect(spec.args).toContain("bestaudio[ext=m4a]/bestaudio");
    expect(spec.contentType).toBe("audio/mp4");
  });
});
