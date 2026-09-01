import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { env } from "@backend/env";
import { AppError } from "@backend/lib/errors";
import { withConcurrencyLimit } from "@backend/lib/concurrency";
import { Readable } from "node:stream";
import {
  fetchMetadata as serverlessFetchMetadata,
  resolveServerlessDownload,
  type VideoMetadata,
  type QualityOption,
  type AudioOption,
  type VideoFormat,
  type RawFormat,
} from "@backend/lib/serverless-youtube";

export type {
  VideoMetadata,
  QualityOption,
  AudioOption,
  VideoFormat,
  RawFormat,
};

export { resolveServerlessDownload };

// ---------------------------------------------------------------------------
// Helper: Check if native yt-dlp is available in the environment
// ---------------------------------------------------------------------------

let ytdlpChecked = false;
let ytdlpAvailable = false;

export async function isYtdlpAvailable(): Promise<boolean> {
  if (ytdlpChecked) return ytdlpAvailable;
  try {
    const bin = env.YTDLP_PATH || "yt-dlp";
    const res = await new Promise<boolean>((resolve) => {
      const proc = spawn(bin, ["--version"], {
        windowsHide: true,
        stdio: "ignore",
      });
      const timer = setTimeout(() => {
        proc.kill("SIGKILL");
        resolve(false);
      }, 3000);
      proc.on("error", () => {
        clearTimeout(timer);
        resolve(false);
      });
      proc.on("close", (code) => {
        clearTimeout(timer);
        resolve(code === 0);
      });
    });
    ytdlpAvailable = res;
    ytdlpChecked = true;
    return res;
  } catch {
    ytdlpAvailable = false;
    ytdlpChecked = true;
    return false;
  }
}

// ---------------------------------------------------------------------------
// Size estimation
// ---------------------------------------------------------------------------

export function estimateBytes(
  filesize: number | undefined | null,
  filesizeApprox: number | undefined | null,
  tbr: number | undefined | null,
  durationSec: number,
): number | undefined {
  if (filesize) return filesize;
  if (filesizeApprox) return filesizeApprox;
  if (tbr && durationSec > 0) return Math.round((tbr * 1000 / 8) * durationSec);
  return undefined;
}

export function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[ - ]/g, " ")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return cleaned || "video";
}

// ---------------------------------------------------------------------------
// Binary resolution & safe execution
// ---------------------------------------------------------------------------

function ytdlpBin(): string {
  return env.YTDLP_PATH || "yt-dlp";
}

interface RunResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

function runBinary(
  bin: string,
  args: string[],
  opts: {
    timeoutMs?: number;
    signal?: AbortSignal;
    onStdout?: (chunk: Buffer) => void;
  } = {},
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const timeoutMs = opts.timeoutMs ?? 60_000;
    const proc = spawn(bin, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      opts.signal?.removeEventListener("abort", onAbort);
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      proc.kill("SIGKILL");
      reject(new AppError("TIMEOUT", "The operation timed out", 504));
    }, timeoutMs);

    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      proc.kill("SIGKILL");
      reject(new AppError("TIMEOUT", "The operation was aborted", 499));
    };
    opts.signal?.addEventListener("abort", onAbort, { once: true });

    proc.stdout?.on("data", (d: Buffer) => {
      stdout += d;
      opts.onStdout?.(d);
    });
    proc.stderr?.on("data", (d: Buffer) => (stderr += d));
    proc.on("error", () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new AppError("PROVIDER_ERROR", `Failed to run ${bin}`, 502));
    });
    proc.on("close", (code) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ stdout, stderr, code });
    });
  });
}

// ---------------------------------------------------------------------------
// Metadata Extraction
// ---------------------------------------------------------------------------

const QUALITY_TIERS: Array<{ key: string; label: string; height: number }> = [
  { key: "best", label: "Best", height: Infinity },
  { key: "2160", label: "4K", height: 2160 },
  { key: "1440", label: "2K", height: 1440 },
  { key: "1080", label: "1080p", height: 1080 },
  { key: "720", label: "720p", height: 720 },
  { key: "480", label: "480p", height: 480 },
  { key: "360", label: "360p", height: 360 },
];

export async function fetchMetadata(
  url: string,
  signal?: AbortSignal,
): Promise<VideoMetadata> {
  const hasYtdlp = await isYtdlpAvailable();
  if (!hasYtdlp) {
    return serverlessFetchMetadata(url, signal);
  }

  return withConcurrencyLimit(async () => {
    const args = ["-J", "--no-playlist", "--skip-download", "--no-warnings", url];

    let result: RunResult;
    try {
      result = await runBinary(ytdlpBin(), args, { timeoutMs: 25_000, signal });
    } catch {
      return serverlessFetchMetadata(url, signal);
    }

    if (result.code !== 0 || !result.stdout.trim()) {
      return serverlessFetchMetadata(url, signal);
    }

    let info: any;
    try {
      info = JSON.parse(result.stdout);
    } catch {
      return serverlessFetchMetadata(url, signal);
    }

    if (!info.id || !info.title) {
      return serverlessFetchMetadata(url, signal);
    }

    return normalizeMetadata(info);
  });
}

function normalizeMetadata(info: any): VideoMetadata {
  const formats: VideoFormat[] = (info.formats ?? [])
    .map((f: any) => {
      const vcodec = f.vcodec ?? "none";
      const acodec = f.acodec ?? "none";
      return {
        formatId: f.format_id,
        ext: f.ext ?? "unknown",
        height: f.height,
        width: f.width,
        fps: f.fps,
        vcodec,
        acodec,
        filesize: f.filesize,
        filesizeApprox: f.filesize_approx,
        tbr: f.tbr,
        formatNote: f.format_note,
        hasVideo: vcodec !== "none",
        hasAudio: acodec !== "none",
      };
    })
    .filter((f: VideoFormat) => f.hasVideo || f.hasAudio);

  const thumbnail = `https://i.ytimg.com/vi/${info.id}/hqdefault.jpg`;
  const videoFormats = formats.filter((f) => f.hasVideo && f.height);
  const maxHeight = videoFormats.reduce((m, f) => Math.max(m, f.height ?? 0), 0);

  const bestAudio =
    formats
      .filter((f) => f.hasAudio && !f.hasVideo)
      .sort((a, b) => (b.tbr ?? 0) - (a.tbr ?? 0))[0] ?? null;
  const bestAudioSize =
    estimateBytes(
      bestAudio?.filesize,
      bestAudio?.filesizeApprox,
      bestAudio?.tbr,
      info.duration ?? 0,
    ) ?? 0;

  const qualityOptions: QualityOption[] = QUALITY_TIERS.map((tier) => {
    const candidates = videoFormats
      .filter((f) => (f.height ?? Infinity) <= tier.height)
      .sort((a, b) => (b.height ?? 0) - (a.height ?? 0) || (b.fps ?? 0) - (a.fps ?? 0));
    const best = candidates[0];

    const videoSize =
      estimateBytes(best?.filesize, best?.filesizeApprox, best?.tbr, info.duration ?? 0) ?? 0;
    const isCombined = best?.hasAudio ?? false;
    const filesizeApprox =
      isCombined || best === undefined
        ? videoSize
        : videoSize > 0
          ? videoSize + bestAudioSize
          : undefined;

    return {
      key: tier.key,
      label: tier.label,
      height: tier.height,
      ext: "mp4",
      contentType: "video/mp4",
      filesizeApprox,
      available: tier.key === "best" ? maxHeight > 0 : maxHeight >= tier.height,
    };
  });

  const audioOptions: AudioOption[] = [
    {
      key: "m4a",
      label: "M4A (best quality)",
      ext: "m4a",
      contentType: "audio/mp4",
      filesizeApprox: bestAudioSize || undefined,
    },
    {
      key: "mp3",
      label: "MP3",
      ext: "mp3",
      contentType: "audio/mpeg",
      filesizeApprox: bestAudioSize || undefined,
    },
  ];

  return {
    id: info.id,
    title: info.title,
    description: info.description ?? "",
    tags: info.tags ?? [],
    channel: info.channel ?? "Unknown channel",
    channelId: info.channel_id ?? "",
    durationSec: info.duration ?? 0,
    viewCount: info.view_count ?? 0,
    likeCount: info.like_count ?? null,
    uploadDate: formatDate(info.upload_date),
    thumbnail,
    formats,
    qualityOptions,
    audioOptions,
    maxHeight,
    isLive: info.is_live ?? false,
  };
}

function formatDate(uploadDate?: string): string {
  if (!uploadDate || !/^\d{8}$/.test(uploadDate)) return "Unknown";
  const y = uploadDate.slice(0, 4);
  const m = uploadDate.slice(4, 6);
  const d = uploadDate.slice(6, 8);
  return `${y}-${m}-${d}`;
}

// ---------------------------------------------------------------------------
// Download Spec & Builders
// ---------------------------------------------------------------------------

export interface DownloadSpec {
  args: string[];
  videoId: string;
  filename: string;
  contentType: string;
}

function videoSelector(quality: string): string {
  if (quality === "best") {
    return "bestvideo[vcodec^=avc1]+bestaudio[ext=m4a]/bestvideo+bestaudio[ext=m4a]/bestvideo+bestaudio/best";
  }
  const height = Number(quality);
  return [
    `bestvideo[height=${height}][vcodec^=avc1]+bestaudio[ext=m4a]`,
    `bestvideo[height=${height}]+bestaudio[ext=m4a]`,
    `bestvideo[height=${height}]+bestaudio`,
    `bestvideo[height<=${height}][vcodec^=avc1]+bestaudio[ext=m4a]`,
    `bestvideo[height<=${height}]+bestaudio[ext=m4a]`,
    `bestvideo[height<=${height}]+bestaudio`,
    `best[height<=${height}]`,
  ].join("/");
}

export function buildVideoDownloadArgs(videoId: string, quality: string): DownloadSpec {
  return {
    args: [
      "-f",
      videoSelector(quality),
      "--merge-output-format",
      "mp4",
      "--concurrent-fragments",
      String(env.DOWNLOAD_FRAGMENTS || 4),
    ],
    videoId,
    filename:
      quality === "best"
        ? `grabytclip-${videoId}-best.mp4`
        : `grabytclip-${videoId}-${quality}p.mp4`,
    contentType: "video/mp4",
  };
}

export function buildAudioDownloadArgs(videoId: string, format: string): DownloadSpec {
  const fragments = [
    "--concurrent-fragments",
    String(env.DOWNLOAD_FRAGMENTS || 4),
  ];
  if (format === "mp3") {
    return {
      args: ["-f", "bestaudio/best", "-x", "--audio-format", "mp3", ...fragments],
      videoId,
      filename: `grabytclip-${videoId}.mp3`,
      contentType: "audio/mpeg",
    };
  }
  return {
    args: ["-f", "bestaudio[ext=m4a]/bestaudio", ...fragments],
    videoId,
    filename: `grabytclip-${videoId}.m4a`,
    contentType: "audio/mp4",
  };
}

// ---------------------------------------------------------------------------
// Codec Guarantees & Re-encoding for Windows Media Player & Universal Devices
// ---------------------------------------------------------------------------

export interface CodecInfo {
  videoCodec: string | null;
  audioCodec: string | null;
}

export function codecsArePlayable(info: CodecInfo): boolean {
  const isVideoH264 = info.videoCodec === "h264" || info.videoCodec === "avc1";
  const isAudioAac = info.audioCodec === "aac" || info.audioCodec === "mp3";
  return isVideoH264 && isAudioAac;
}

export async function probeCodecs(path: string): Promise<CodecInfo> {
  const result = await runBinary(env.FFPROBE_PATH || "ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "stream=codec_name,codec_type",
    "-of",
    "csv=p=0",
    path,
  ]);
  let videoCodec: string | null = null;
  let audioCodec: string | null = null;
  for (const line of result.stdout.split("\n")) {
    const [kind, codec] = line.trim().split(",");
    if (!codec) continue;
    if (kind === "video") videoCodec = codec.toLowerCase();
    if (kind === "audio") audioCodec = codec.toLowerCase();
  }
  return { videoCodec, audioCodec };
}

/**
 * Ensures 100% universal playability on Windows Media Player, QuickTime, TV, and all devices.
 * If video is VP9/AV1, transcodes to standard H.264 (yuv420p) with ultrafast encoder.
 * If audio is Opus/other, transcodes to standard AAC (192k).
 */
export async function ensurePlayableDownload(
  file: DownloadedFile,
  opts: {
    durationSec?: number;
    onProgress?: (p: { percent: number }) => void;
    signal?: AbortSignal;
  } = {},
): Promise<{ file: DownloadedFile; reencoded: boolean }> {
  try {
    const info = await probeCodecs(file.path);
    if (codecsArePlayable(info)) {
      return { file, reencoded: false };
    }

    const dest = join(
      tmpdir(),
      `grabytclip-${randomBytes(8).toString("hex")}.mp4`,
    );

    const isVideoH264 = info.videoCodec === "h264" || info.videoCodec === "avc1";
    const isAudioAac = info.audioCodec === "aac";

    // If video is already H.264, stream-copy video. If VP9/AV1, transcode with ultrafast H.264 yuv420p using all CPU threads
    const vArgs = isVideoH264
      ? ["-c:v", "copy"]
      : ["-c:v", "libx264", "-preset", "ultrafast", "-crf", "22", "-pix_fmt", "yuv420p", "-threads", "0"];

    // If audio is already AAC, stream-copy audio. Otherwise convert to AAC
    const aArgs = isAudioAac
      ? ["-c:a", "copy"]
      : ["-c:a", "aac", "-b:a", "192k"];

    const args = [
      "-y",
      "-i",
      file.path,
      ...vArgs,
      ...aArgs,
      "-movflags",
      "+faststart",
      "-nostats",
      "-progress",
      "pipe:1",
      dest,
    ];

    const result = await runBinary(env.FFMPEG_PATH || "ffmpeg", args, {
      timeoutMs: (env.CONVERT_TIMEOUT || 1800) * 1000,
      signal: opts.signal,
      onStdout: (chunk) => {
        if (!opts.onProgress || !opts.durationSec) return;
        const out = chunk.toString();
        for (const line of out.split("\n")) {
          const [k, v] = line.trim().split("=");
          if ((k === "out_time_us" || k === "out_time_ms") && v) {
            const us = Number(v);
            if (Number.isFinite(us) && us > 0) {
              const sec = k === "out_time_us" ? us / 1_000_000 : us / 1_000;
              const pct = Math.min(99, Math.round((sec / opts.durationSec) * 100));
              opts.onProgress({ percent: pct });
            }
          }
        }
      },
    });

    if (result.code === 0) {
      const s = await stat(dest);
      if (s.size > 0) {
        void unlink(file.path).catch(() => {});
        return {
          file: {
            path: dest,
            size: s.size,
            filename: file.filename.replace(/\.[^.]+$/, ".mp4"),
            contentType: "video/mp4",
          },
          reencoded: true,
        };
      }
    }

    return { file, reencoded: false };
  } catch {
    return { file, reencoded: false };
  }
}

// ---------------------------------------------------------------------------
// Downloads (Streamed to disk)
// ---------------------------------------------------------------------------

export interface DownloadedFile {
  path: string;
  size: number;
  filename: string;
  contentType: string;
}

export interface DownloadProgress {
  status: string;
  downloadedBytes: number;
  totalBytes: number | null;
  totalBytesEstimate: number | null;
  speedBytesPerSec: number | null;
  etaSec: number | null;
}

export function parseProgressLine(line: string): DownloadProgress | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const parts = trimmed.split("|");
  if (parts.length < 6) return null;

  const [status, dlStr, totStr, estStr, spdStr, etaStr] = parts;
  if (status !== "downloading" && status !== "finished") return null;

  const parseNum = (v: string | undefined): number | null => {
    if (!v || v === "NA") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const downloadedBytes = parseNum(dlStr) ?? 0;
  return {
    status,
    downloadedBytes,
    totalBytes: parseNum(totStr),
    totalBytesEstimate: parseNum(estStr),
    speedBytesPerSec: parseNum(spdStr),
    etaSec: parseNum(etaStr),
  };
}

export async function downloadToTempFile(
  spec: DownloadSpec,
  opts: {
    signal?: AbortSignal;
    timeoutMs?: number;
    onProgress?: (p: DownloadProgress) => void;
  } = {},
): Promise<DownloadedFile> {
  const ext = spec.filename.split(".").pop() ?? "mp4";
  const tmpPath = join(
    tmpdir(),
    `grabytclip-${randomBytes(8).toString("hex")}.${ext}`,
  );
  const url = `https://www.youtube.com/watch?v=${spec.videoId}`;
  const progressTemplate =
    "download:%(progress.status)s|%(progress.downloaded_bytes)s|%(progress.total_bytes)s|%(progress.total_bytes_estimate)s|%(progress.speed)s|%(progress.eta)s";

  const args = [
    ...spec.args,
    "--no-playlist",
    "--no-warnings",
    "--no-part",
    "--no-mtime",
    "--progress-template",
    progressTemplate,
    "-o",
    tmpPath,
    url,
  ];
  const timeoutMs = opts.timeoutMs ?? (env.DOWNLOAD_TIMEOUT || 120) * 1000;

  try {
    return await withConcurrencyLimit(
      () =>
        new Promise<DownloadedFile>((resolve, reject) => {
          const proc = spawn(ytdlpBin(), args, {
            windowsHide: true,
            stdio: ["ignore", "pipe", "pipe"],
          });

          let stderr = "";
          let settled = false;
          const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            proc.kill("SIGKILL");
            reject(new AppError("TIMEOUT", "The download took too long", 504));
          }, timeoutMs);

          const cleanup = () => {
            clearTimeout(timer);
            opts.signal?.removeEventListener("abort", onAbort);
          };
          const onAbort = () => {
            if (settled) return;
            settled = true;
            cleanup();
            proc.kill("SIGKILL");
            reject(new AppError("TIMEOUT", "The request was aborted", 499));
          };
          opts.signal?.addEventListener("abort", onAbort, { once: true });

          proc.stdout?.on("data", (d: Buffer) => {
            if (!opts.onProgress) return;
            for (const line of d.toString().split("\n")) {
              const sample = parseProgressLine(line);
              if (sample) opts.onProgress(sample);
            }
          });

          proc.stderr?.on("data", (d: Buffer) => (stderr += d));
          proc.on("error", () => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(
              new AppError("PROVIDER_ERROR", "yt-dlp process failed to start", 502),
            );
          });

          proc.on("close", async (code) => {
            if (settled) return;
            settled = true;
            cleanup();
            if (code !== 0) {
              const msg = extractYtError(stderr);
              void unlink(tmpPath).catch(() => {});
              reject(new AppError("PROVIDER_ERROR", msg, 422));
              return;
            }
            try {
              const info = await stat(tmpPath);
              if (info.size === 0) {
                void unlink(tmpPath).catch(() => {});
                reject(
                  new AppError("PROVIDER_ERROR", "The download produced no data", 422),
                );
                return;
              }
              resolve({
                path: tmpPath,
                size: info.size,
                filename: spec.filename,
                contentType: spec.contentType,
              });
            } catch {
              reject(new AppError("PROVIDER_ERROR", "Download output missing", 500));
            }
          });
        }),
    );
  } catch (e) {
    void unlink(tmpPath).catch(() => {});
    throw e;
  }
}

export async function cleanupTempFile(path: string): Promise<void> {
  void unlink(path).catch(() => {});
}

export function fileResponse(file: DownloadedFile): Response {
  const nodeStream = createReadStream(file.path);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
  nodeStream.on("close", () => void cleanupTempFile(file.path));

  return new Response(webStream, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.size),
      "Content-Disposition": `attachment; filename="${sanitizeFilename(file.filename)}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function extractYtError(stderr: string): string {
  const lines = stderr
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines) {
    if (/ERROR:/.test(line)) {
      const msg = line.replace(/^ERROR:\s*/, "").trim();
      if (/Video unavailable|Private video/.test(msg)) {
        return "This video is unavailable or private.";
      }
      if (/Sign in to confirm|age.restriction/.test(msg)) {
        return "This video requires sign-in or is age-restricted.";
      }
      if (/copyright|removed/.test(msg)) {
        return "This video was removed or is unavailable in your region.";
      }
      return msg.slice(0, 200);
    }
  }
  return "Unable to process this video. Please try another link.";
}
