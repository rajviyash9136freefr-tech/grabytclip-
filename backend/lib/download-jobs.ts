import { randomUUID } from "node:crypto";
import { env } from "@backend/env";
import { AppError } from "@backend/lib/errors";
import {
  isYtdlpAvailable,
  buildVideoDownloadArgs,
  buildAudioDownloadArgs,
  downloadToTempFile,
  ensurePlayableDownload,
  cleanupTempFile,
  type DownloadSpec,
  type DownloadProgress,
} from "@backend/lib/youtube";
import { resolveServerlessDownload } from "@backend/lib/serverless-youtube";

// ---------------------------------------------------------------------------
// In-memory download job registry
// ---------------------------------------------------------------------------

export type JobStatus =
  "pending" | "downloading" | "merging" | "converting" | "ready" | "error";

export interface DownloadJob {
  id: string;
  videoId: string;
  type: "video" | "audio";
  quality?: string;
  format?: string;
  ip: string;
  status: JobStatus;
  percent: number;
  downloadedBytes: number;
  totalBytes: number | null;
  speedBytesPerSec: number | null;
  etaSec: number | null;
  errorCode?: string;
  errorMessage?: string;
  filePath?: string;
  streamUrl?: string;
  filename?: string;
  contentType?: string;
  size?: number;
  expectedBytes?: number;
  durationSec?: number;
  createdAt: number;
  updatedAt: number;
}

interface CreateJobInput {
  videoId: string;
  type: "video" | "audio";
  quality?: string;
  format?: string;
  ip: string;
  expectedBytes?: number | null;
  durationSec?: number | null;
  signal?: AbortSignal;
}

interface JobStore {
  jobs: Map<string, DownloadJob>;
  abortControllers: Map<string, AbortController>;
  timer: ReturnType<typeof setInterval> | null;
}

const globalStore = globalThis as typeof globalThis & { __grabytclipJobs?: JobStore };

if (!globalStore.__grabytclipJobs) {
  globalStore.__grabytclipJobs = {
    jobs: new Map(),
    abortControllers: new Map(),
    timer: null,
  };
}
if (!globalStore.__grabytclipJobs.abortControllers) {
  globalStore.__grabytclipJobs.abortControllers = new Map();
}

const jobs = globalStore.__grabytclipJobs.jobs;
const abortControllers = globalStore.__grabytclipJobs.abortControllers;
const TTL_MS = env.DOWNLOAD_JOB_TTL_MS || 1_800_000;
const MAX_ACTIVE_PER_IP = 10;
const MAX_JOBS = 500;

function activeKey(job: Pick<DownloadJob, "videoId" | "type" | "quality" | "format">) {
  return `${job.videoId}:${job.type}:${job.quality ?? ""}:${job.format ?? ""}`;
}

function sweep() {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (job.status === "error" || now - job.updatedAt > TTL_MS) {
      if (job.filePath) void cleanupTempFile(job.filePath);
      const controller = abortControllers.get(id);
      if (controller) {
        controller.abort();
        abortControllers.delete(id);
      }
      jobs.delete(id);
    }
  }
  if (jobs.size > MAX_JOBS) {
    const sorted = [...jobs.entries()].sort((a, b) => a[1].updatedAt - b[1].updatedAt);
    for (const [id, job] of sorted.slice(0, jobs.size - MAX_JOBS)) {
      if (job.filePath) void cleanupTempFile(job.filePath);
      const controller = abortControllers.get(id);
      if (controller) {
        controller.abort();
        abortControllers.delete(id);
      }
      jobs.delete(id);
    }
  }
}

if (!globalStore.__grabytclipJobs.timer) {
  globalStore.__grabytclipJobs.timer = setInterval(sweep, 60_000);
  if (typeof globalStore.__grabytclipJobs.timer?.unref === "function") {
    globalStore.__grabytclipJobs.timer.unref();
  }
}

export function getJob(id: string): DownloadJob | undefined {
  sweep();
  return jobs.get(id);
}

export function cancelJob(id: string): boolean {
  const controller = abortControllers.get(id);
  if (controller) {
    controller.abort();
    abortControllers.delete(id);
  }
  const job = jobs.get(id);
  if (job) {
    if (job.filePath) void cleanupTempFile(job.filePath);
    jobs.delete(id);
    return true;
  }
  return false;
}

export function toJobView(job: DownloadJob) {
  return {
    id: job.id,
    videoId: job.videoId,
    type: job.type,
    quality: job.quality,
    format: job.format,
    status: job.status,
    percent: job.percent,
    downloadedBytes: job.downloadedBytes,
    totalBytes: job.totalBytes,
    speedBytesPerSec: job.speedBytesPerSec,
    etaSec: job.etaSec,
    errorCode: job.errorCode,
    errorMessage: job.errorMessage,
    filename: job.filename,
    contentType: job.contentType,
    size: job.size,
    streamUrl: job.streamUrl,
  };
}

export async function createJob(input: CreateJobInput): Promise<DownloadJob> {
  sweep();

  const activeForIp = [...jobs.values()].filter(
    (j) => j.ip === input.ip && j.status !== "ready" && j.status !== "error",
  );
  if (activeForIp.length >= MAX_ACTIVE_PER_IP) {
    throw new AppError(
      "RATE_LIMITED",
      "Too many active downloads. Wait for one to finish.",
      429,
    );
  }

  const dup = activeForIp.find((j) => activeKey(j) === activeKey(input));
  if (dup) {
    return dup;
  }

  const id = randomUUID();
  const job: DownloadJob = {
    id,
    videoId: input.videoId,
    type: input.type,
    quality: input.quality,
    format: input.format,
    ip: input.ip,
    status: "pending",
    percent: 5,
    downloadedBytes: 0,
    totalBytes: input.expectedBytes ?? null,
    speedBytesPerSec: null,
    etaSec: null,
    expectedBytes: input.expectedBytes ?? undefined,
    durationSec: input.durationSec ?? undefined,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const hasYtdlp = await isYtdlpAvailable();
  if (!hasYtdlp) {
    const backendUrl = env.BACKEND_URL || "https://grabytclip-1.onrender.com";
    if (backendUrl && !backendUrl.includes("localhost")) {
      try {
        const backendRes = await fetch(`${backendUrl}/api/video/download`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoId: job.videoId,
            type: job.type,
            quality: job.quality,
            format: job.format,
            expectedBytes: input.expectedBytes,
            durationSec: input.durationSec,
          }),
          signal: AbortSignal.timeout(15_000),
        });

        if (backendRes.ok) {
          const backendData = (await backendRes.json()) as {
            data?: { jobId: string; job?: Partial<DownloadJob> };
          };
          if (backendData?.data?.jobId) {
            const remoteJob = backendData.data.job;
            job.id = backendData.data.jobId;
            job.status = remoteJob?.status || "downloading";
            job.percent = remoteJob?.percent || 10;
            job.streamUrl = `${backendUrl}/api/video/download/file/${backendData.data.jobId}`;
            job.updatedAt = Date.now();
            jobs.set(job.id, job);
            return job;
          }
        }
      } catch {
        // Fallback to direct serverless resolver
      }
    }

    try {
      job.status = "downloading";
      job.percent = 50;
      const result = await resolveServerlessDownload({
        videoId: job.videoId,
        type: job.type,
        quality: job.quality,
        format: job.format,
        signal: input.signal,
      });
      job.status = "ready";
      job.percent = 100;
      job.streamUrl = result.streamUrl;
      job.filename = result.filename;
      job.contentType = result.contentType;
      job.updatedAt = Date.now();
      jobs.set(id, job);
      return job;
    } catch (e) {
      const err =
        e instanceof AppError
          ? e
          : new AppError("INTERNAL_ERROR", "Download link generation failed", 500);
      job.status = "error";
      job.errorCode = err.code;
      job.errorMessage = err.message;
      job.updatedAt = Date.now();
      jobs.set(id, job);
      throw err;
    }
  }

  jobs.set(id, job);

  const controller = new AbortController();
  abortControllers.set(id, controller);
  if (input.signal) {
    input.signal.addEventListener("abort", () => controller.abort());
  }

  void runJob(job, controller.signal)
    .catch((e) => {
      const err =
        e instanceof AppError
          ? e
          : new AppError("INTERNAL_ERROR", "Download failed", 500);
      job.status = "error";
      job.errorCode = err.code;
      job.errorMessage = err.message;
      job.updatedAt = Date.now();
    })
    .finally(() => {
      abortControllers.delete(id);
    });

  return job;
}

async function runJob(job: DownloadJob, signal?: AbortSignal) {
  const hasYtdlp = await isYtdlpAvailable();

  if (hasYtdlp) {
    const spec: DownloadSpec =
      job.type === "audio"
        ? buildAudioDownloadArgs(job.videoId, job.format ?? "m4a")
        : buildVideoDownloadArgs(job.videoId, job.quality ?? "best");

    let lastRawDownloaded = 0;
    let streamOffset = 0;
    let lastTs = Date.now();
    let speedEstimate = 0;

    let file = await downloadToTempFile(spec, {
      signal,
      onProgress: (p: DownloadProgress) => {
        const now = Date.now();
        job.status = p.status === "finished" ? "merging" : "downloading";

        // When yt-dlp switches from video stream to audio stream, downloadedBytes resets to 0
        if (p.downloadedBytes < lastRawDownloaded && lastRawDownloaded > 0) {
          streamOffset += lastRawDownloaded;
        }
        lastRawDownloaded = p.downloadedBytes;

        const currentDownloaded = streamOffset + p.downloadedBytes;
        job.downloadedBytes = Math.max(job.downloadedBytes, currentDownloaded);

        const currentStreamTotal = p.totalBytes ?? p.totalBytesEstimate ?? 0;
        const totalEstimate = streamOffset + currentStreamTotal;
        const safeTotal = Math.max(
          totalEstimate,
          job.expectedBytes ?? 0,
          job.downloadedBytes,
        );
        job.totalBytes = safeTotal > 0 ? safeTotal : null;

        if (p.speedBytesPerSec) {
          speedEstimate = p.speedBytesPerSec;
          job.speedBytesPerSec = p.speedBytesPerSec;
        } else {
          const dt = (now - lastTs) / 1000;
          const db = currentDownloaded - lastRawDownloaded;
          if (dt > 0.5 && db > 0) {
            speedEstimate = db / dt;
            job.speedBytesPerSec = speedEstimate;
          }
        }

        if (p.status === "finished") {
          job.percent = 98;
          job.etaSec = 0;
          job.speedBytesPerSec = null;
        } else if (job.totalBytes && job.totalBytes > 0) {
          job.percent = Math.min(
            95,
            Math.max(5, Math.round((job.downloadedBytes / job.totalBytes) * 100)),
          );
        } else if (job.expectedBytes && job.expectedBytes > 0) {
          job.percent = Math.min(
            95,
            Math.max(5, Math.round((job.downloadedBytes / job.expectedBytes) * 100)),
          );
        }

        if (job.totalBytes && speedEstimate > 0 && p.status !== "finished") {
          job.etaSec = Math.max(
            0,
            Math.round((job.totalBytes - job.downloadedBytes) / speedEstimate),
          );
        }

        job.updatedAt = now;
        lastTs = now;
      },
    });

    if (job.type === "video") {
      try {
        job.status = "converting";
        job.speedBytesPerSec = null;
        job.etaSec = null;
        job.percent = 96;
        job.updatedAt = Date.now();
        const converted = await ensurePlayableDownload(file, {
          durationSec: job.durationSec,
          signal,
          onProgress: (p) => {
            job.status = "converting";
            job.percent = Math.min(99, Math.max(90, p.percent));
            job.updatedAt = Date.now();
          },
        });
        file = converted.file;
      } catch {
        // Fall back to original file if re-encoding isn't needed or available
      }
    }

    job.status = "ready";
    job.percent = 100;
    job.downloadedBytes = file.size;
    job.totalBytes = file.size;
    job.speedBytesPerSec = null;
    job.etaSec = null;
    job.filePath = file.path;
    job.filename = file.filename;
    job.contentType = file.contentType;
    job.size = file.size;
    job.updatedAt = Date.now();
    return;
  }

  // Serverless fallback
  job.status = "downloading";
  job.percent = 40;
  job.updatedAt = Date.now();

  const result = await resolveServerlessDownload({
    videoId: job.videoId,
    type: job.type,
    quality: job.quality,
    format: job.format,
    signal,
  });

  job.status = "ready";
  job.percent = 100;
  job.streamUrl = result.streamUrl;
  job.filename = result.filename;
  job.contentType = result.contentType;
  job.downloadedBytes = job.totalBytes ?? 0;
  job.updatedAt = Date.now();
}
