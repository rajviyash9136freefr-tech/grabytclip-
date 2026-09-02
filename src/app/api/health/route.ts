import { ok } from "@backend/lib/errors";
import { isYtdlpAvailable } from "@backend/lib/youtube";

export const dynamic = "force-dynamic";

export async function GET() {
  const hasYtdlp = await isYtdlpAvailable();
  return ok({
    status: "ok",
    version: "1.0.0",
    engine: hasYtdlp ? "native-ytdlp" : "serverless-edge",
    ytdlpAvailable: hasYtdlp,
  });
}
