interface Entry {
  count: number;
  windowStart: number;
}

const limits = new Map<string, Entry>();

function cleanExpired(now: number): void {
  for (const [key, entry] of limits) {
    if (now - entry.windowStart > 24 * 60 * 60 * 1000) {
      limits.delete(key);
    }
  }
}

export function ipFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export function isRateLimited(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = limits.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    limits.set(key, { count: 1, windowStart: now });
    cleanExpired(now);
    return false;
  }
  entry.count += 1;
  return entry.count > maxRequests;
}