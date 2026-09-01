import { ok } from "@backend/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok({
    status: "ok",
    version: "1.0.0",
    engine: "serverless-edge",
    provider: "Cloudflare Workers",
  });
}
