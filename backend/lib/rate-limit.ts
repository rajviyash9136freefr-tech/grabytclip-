import { env } from "@backend/env";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
const MAX_ENTRIES = 10_000;

/** Simple in-memory sliding-window rate limiter. */
export async function checkRateLimit(
  key: string,
  limit: number = env.RATE_LIMIT_REQUESTS,
  windowMs: number = env.RATE_LIMIT_WINDOW_MS,
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    // Opportunistically evict expired entries and cap the map size so a flood of
    // unique/spoofed IPs can't grow memory without bound (memory-DoS).
    if (store.size > MAX_ENTRIES) {
      for (const [k, v] of store) {
        if (now > v.resetAt) store.delete(k);
      }
      if (store.size > MAX_ENTRIES) {
        // Still too big: drop the oldest (closest-to-expiry) entries.
        const sorted = [...store.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
        const excess = store.size - MAX_ENTRIES;
        for (let i = 0; i < excess; i++) {
          store.delete(sorted[i]![0]);
        }
      }
    }
  } else {
    entry.count++;
  }

  if (entry.count > limit) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSec };
  }

  return { allowed: true, retryAfterSec: 0 };
}

/** Get client IP from request headers. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0]?.trim();
    if (ip) return ip;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "127.0.0.1";
}
