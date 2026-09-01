import { describe, it, expect } from "vitest";
import {
  formatDuration,
  formatNumber,
  hashtagify,
  buildDownloadUrl,
  formatFileSize,
  formatSpeed,
  formatEta,
} from "@frontend/lib/format";

describe("formatDuration", () => {
  it("formats seconds as mm:ss", () => {
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(3600)).toBe("1:00:00");
    expect(formatDuration(3661)).toBe("1:01:01");
    expect(formatDuration(0)).toBe("0:00");
  });
});

describe("formatNumber", () => {
  it("formats large view counts", () => {
    expect(formatNumber(999)).toBe("999");
    expect(formatNumber(1500)).toBe("1.5K");
    expect(formatNumber(1234567)).toBe("1.2M");
    expect(formatNumber(2000000000)).toBe("2.0B");
  });
});

describe("hashtagify", () => {
  it("prefixes tags with #", () => {
    expect(hashtagify(["music", "cover"])).toBe("#music #cover");
  });
  it("does not double-prefix", () => {
    expect(hashtagify(["#music", "cover"])).toBe("#music #cover");
  });
  it("returns empty string for no tags", () => {
    expect(hashtagify([])).toBe("");
  });
});

describe("formatFileSize", () => {
  it("formats bytes as KB / MB / GB", () => {
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(1500)).toBe("1 KB");
    expect(formatFileSize(1_500_000)).toBe("1.4 MB");
    expect(formatFileSize(2_500_000_000)).toBe("2.33 GB");
  });
});

describe("formatSpeed", () => {
  it("formats bytes per second", () => {
    expect(formatSpeed(500_000)).toBe("488 KB/s");
    expect(formatSpeed(4_200_000)).toBe("4.0 MB/s");
    expect(formatSpeed(1_500_000_000)).toBe("1.40 GB/s");
  });
});

describe("formatEta", () => {
  it("formats seconds as duration", () => {
    expect(formatEta(5)).toBe("5s");
    expect(formatEta(83)).toBe("1:23");
    expect(formatEta(3661)).toBe("61:01");
    expect(formatEta(-1)).toBe("—");
  });
});

describe("buildDownloadUrl", () => {
  it("builds a video download URL", () => {
    const url = buildDownloadUrl("abc123abc12", "video", "1080");
    expect(url).toContain("type=video");
    expect(url).toContain("quality=1080");
    expect(url).toContain("videoId=abc123abc12");
  });

  it("builds an audio download URL", () => {
    const url = buildDownloadUrl("abc123abc12", "audio", undefined, "mp3");
    expect(url).toContain("type=audio");
    expect(url).toContain("format=mp3");
  });
});