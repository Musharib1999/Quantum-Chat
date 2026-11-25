/**
 * Lightweight bounded in-memory sliding-window rate limiter for Next.js API routes.
 * Protects auth endpoints (/api/auth/login, /api/auth/signup) from brute-force and spam.
 */

interface Bucket {
  timestamps: number[];
}

const MAX_BUCKETS = 5000;
const store = new Map<string, Bucket>();

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const cutoff = now - windowMs;

  // Bounded eviction to prevent unbounded memory growth under IP-spray attacks
  if (store.size >= MAX_BUCKETS && !store.has(key)) {
    for (const [k, b] of store.entries()) {
      const fresh = b.timestamps.filter((t) => t > cutoff);
      if (fresh.length === 0) {
        store.delete(k);
      } else {
        b.timestamps = fresh;
      }
      if (store.size < MAX_BUCKETS * 0.8) break;
    }
    if (store.size >= MAX_BUCKETS) {
      const oldestKey = store.keys().next().value;
      if (oldestKey) store.delete(oldestKey);
    }
  }

  const bucket = store.get(key) || { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    store.set(key, bucket);
    return { allowed: false, retryAfterSec };
  }

  bucket.timestamps.push(now);
  store.set(key, bucket);
  return { allowed: true, retryAfterSec: 0 };
}
