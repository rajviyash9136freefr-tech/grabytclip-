import { spawn } from "node:child_process";
import { ok } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ytDlpAvailable = await checkYtdlp();
  return ok({
    status: "ok",
    version: "1.0.0",
    engine: ytDlpAvailable ? "available" : "missing",
  });
}

async function checkYtdlp(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn(process.env.YTDLP_PATH || "yt-dlp", ["--version"], {
      windowsHide: true,
      stdio: "ignore",
    });
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      resolve(false);
    }, 5000);
    proc.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve(code === 0);
    });
  });
}
