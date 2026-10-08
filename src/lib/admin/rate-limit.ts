/**
 * Failed sign-in throttle (Phase 10.1). In memory, so it is per server instance and resets on
 * restart — a brake on password guessing, not a guarantee. A shared store replaces it once the
 * CMS database exists (docs/architecture/admin-cms.md).
 *
 * - 5 failures from one client within 15 minutes lock that client for 15 minutes.
 * - 50 failures from all clients within 15 minutes lock sign-in globally (spoofed IPs).
 */
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const MAX_FAILURES_PER_CLIENT = 5;
export const MAX_FAILURES_GLOBAL = 50;
const GLOBAL = "*";

interface Bucket {
  failures: number;
  windowStart: number;
  lockedUntil: number;
}

const buckets = new Map<string, Bucket>();

function current(key: string, now: number): Bucket {
  const bucket = buckets.get(key);
  if (!bucket || (now - bucket.windowStart > LOGIN_WINDOW_MS && now >= bucket.lockedUntil)) {
    const fresh = { failures: 0, windowStart: now, lockedUntil: 0 };
    buckets.set(key, fresh);
    return fresh;
  }
  return bucket;
}

export function isLoginLocked(client: string, now = Date.now()): boolean {
  return current(client, now).lockedUntil > now || current(GLOBAL, now).lockedUntil > now;
}

export function recordLoginFailure(client: string, now = Date.now()): void {
  for (const [key, limit] of [
    [client, MAX_FAILURES_PER_CLIENT],
    [GLOBAL, MAX_FAILURES_GLOBAL],
  ] as const) {
    const bucket = current(key, now);
    bucket.failures += 1;
    if (bucket.failures >= limit) bucket.lockedUntil = now + LOGIN_WINDOW_MS;
  }
  if (buckets.size > 10_000) buckets.clear();
}

export function clearLoginFailures(client: string): void {
  buckets.delete(client);
}

/** Tests only. */
export function resetLoginThrottle(): void {
  buckets.clear();
}

/** Best-effort client key from proxy headers (the platform's own header first). */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return headers.get("x-real-ip")?.trim() || forwarded || "unknown";
}
