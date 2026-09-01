import { NextRequest } from "next/server";
import { fail } from "@backend/lib/errors";
import { getJob } from "@backend/lib/download-jobs";
import { fileResponse } from "@backend/lib/youtube";
import { checkRateLimit, getClientIp } from "@backend/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Stream or redirect the completed file for a ready download job. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const ip = getClientIp(_request);
  const rl = await checkRateLimit(`file:${ip}`, 60, 60_000);
  if (!rl.allowed) {
    return fail("RATE_LIMITED", "Too many downloads. Try again soon.", 429);
  }

  const job = getJob(jobId);
  if (!job) {
    return fail("NOT_FOUND", "Download job not found or expired.", 404);
  }

  if (job.status !== "ready") {
    return fail(
      "PROVIDER_ERROR",
      job.status === "error"
        ? (job.errorMessage ?? "The download failed.")
        : "The download is still in progress.",
      job.status === "error" ? 422 : 409,
    );
  }

  if (job.filePath) {
    return fileResponse({
      path: job.filePath,
      size: job.size ?? 0,
      filename: job.filename ?? `grabytclip-${job.videoId}.mp4`,
      contentType: job.contentType ?? "application/octet-stream",
    });
  }

  if (job.streamUrl) {
    return Response.redirect(job.streamUrl, 302);
  }

  return fail("PROVIDER_ERROR", "Download output is missing.", 500);
}
