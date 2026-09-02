import { NextRequest } from "next/server";
import { fail, ok, toErrorResponse } from "@backend/lib/errors";
import { getJob, cancelJob, toJobView } from "@backend/lib/download-jobs";
import { checkRateLimit, getClientIp } from "@backend/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Poll the live status/progress of a download job. */
export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await props.params;
    const ip = getClientIp(_request);
    const rl = await checkRateLimit(`job:${ip}`, 120, 60_000);
    if (!rl.allowed) {
      return fail("RATE_LIMITED", "Too many requests. Try again soon.", 429);
    }

    const job = getJob(jobId);
    if (!job) {
      const backendUrl = process.env.BACKEND_URL || "https://grabytclip-1.onrender.com";
      if (backendUrl && !backendUrl.includes("localhost")) {
        try {
          const backendRes = await fetch(
            `${backendUrl}/api/video/download/job/${jobId}`,
            {
              headers: { "Content-Type": "application/json" },
              signal: AbortSignal.timeout(5000),
            },
          );
          if (backendRes.ok) {
            const data = await backendRes.json();
            return Response.json(data, { status: 200 });
          }
        } catch {
          // Continue to 404
        }
      }
      return fail("NOT_FOUND", "Download job not found or expired.", 404);
    }
    return ok(toJobView(job));
  } catch (e) {
    return toErrorResponse(e);
  }
}

/** Cancel an ongoing download job. */
export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await props.params;
    const canceled = cancelJob(jobId);
    return ok({ canceled });
  } catch (e) {
    return toErrorResponse(e);
  }
}
