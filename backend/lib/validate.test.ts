import { describe, it, expect } from "vitest";
import { videoUrlSchema, extractYoutubeId, downloadQuerySchema } from "@backend/lib/validate";

describe("extractYoutubeId", () => {
  const ID = "dQw4w9WgXcQ";

  it("extracts from standard watch URLs", () => {
    expect(extractYoutubeId(`https://www.youtube.com/watch?v=${ID}`)).toBe(ID);
    expect(extractYoutubeId(`https://youtube.com/watch?v=${ID}`)).toBe(ID);
  });

  it("extracts from youtu.be short URLs", () => {
    expect(extractYoutubeId(`https://youtu.be/${ID}`)).toBe(ID);
  });

  it("extracts from shorts, embed, live and music URLs", () => {
    expect(extractYoutubeId(`https://www.youtube.com/shorts/${ID}`)).toBe(ID);
    expect(extractYoutubeId(`https://www.youtube.com/embed/${ID}`)).toBe(ID);
    expect(extractYoutubeId(`https://www.youtube.com/live/${ID}`)).toBe(ID);
    expect(extractYoutubeId(`https://music.youtube.com/watch?v=${ID}`)).toBe(ID);
  });

  it("extracts from bare IDs", () => {
    expect(extractYoutubeId(ID)).toBe(ID);
  });

  it("returns null for non-YouTube input", () => {
    expect(extractYoutubeId("https://example.com/watch?v=abc")).toBeNull();
    expect(extractYoutubeId("not a url")).toBeNull();
    expect(extractYoutubeId("https://vimeo.com/12345")).toBeNull();
  });
});

describe("videoUrlSchema", () => {
  it("accepts YouTube URLs and returns canonical url + videoId", () => {
    const result = videoUrlSchema.parse("https://youtu.be/dQw4w9WgXcQ");
    expect(result).toEqual({
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      videoId: "dQw4w9WgXcQ",
    });
  });

  it("rejects non-YouTube hosts (SSRF guard)", () => {
    expect(() =>
      videoUrlSchema.parse("https://169.254.169.254/latest/meta-data"),
    ).toThrow();
    expect(() => videoUrlSchema.parse("https://example.com/watch?v=abc")).toThrow();
    expect(() =>
      videoUrlSchema.parse("https://www.youtube.com@evil.com/watch?v=abc"),
    ).toThrow();
  });

  it("rejects bare junk", () => {
    expect(() => videoUrlSchema.parse("")).toThrow();
    expect(() => videoUrlSchema.parse("javascript:alert(1)")).toThrow();
  });
});

describe("downloadQuerySchema", () => {
  it("validates a video download query", () => {
    const result = downloadQuerySchema.parse({
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      videoId: "dQw4w9WgXcQ",
      type: "video",
      quality: "1080",
    });
    expect(result.type).toBe("video");
    expect(result.quality).toBe("1080");
  });

  it("rejects bad video IDs", () => {
    expect(() =>
      downloadQuerySchema.parse({
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        videoId: "not-a-real-id!",
        type: "video",
      }),
    ).toThrow();
  });
});
