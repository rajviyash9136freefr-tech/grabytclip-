/** Bound global concurrency for yt-dlp processes (heavy CPU/network). */

function resolveMax(): number {
  const raw = Number(process.env.MAX_CONCURRENT_DOWNLOADS ?? 5);
  // Clamp to a sane range: '0' or a parse failure would deadlock or run unlimited.
  if (!Number.isFinite(raw) || raw < 1) return 5;
  return Math.floor(Math.min(raw, 50));
}

const MAX_CONCURRENT = resolveMax();

let active = 0;
const queue: Array<() => void> = [];

export async function withConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => queue.push(resolve));
  }
  active++;
  try {
    return await fn();
  } finally {
    active--;
    queue.shift()?.();
  }
}

export function getActiveDownloads(): number {
  return active;
}

export function getMaxConcurrentDownloads(): number {
  return MAX_CONCURRENT;
}
