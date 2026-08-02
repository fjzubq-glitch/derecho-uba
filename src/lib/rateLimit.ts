interface Attempt {
  count: number;
  firstAttempt: number;
}

const FAILED_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const MAX_FAILED_ATTEMPTS = 5;

const attempts = new Map<string, Attempt>();

function ipFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return ip;
}

export function checkRateLimit(request: Request): { allowed: boolean; retryAfterSec?: number } {
  const ip = ipFromRequest(request);
  const now = Date.now();
  const attempt = attempts.get(ip);

  if (!attempt) {
    return { allowed: true };
  }

  if (now - attempt.firstAttempt > FAILED_WINDOW_MS) {
    attempts.delete(ip);
    return { allowed: true };
  }

  if (attempt.count >= MAX_FAILED_ATTEMPTS) {
    const retryAfterSec = Math.ceil((FAILED_WINDOW_MS - (now - attempt.firstAttempt)) / 1000);
    return { allowed: false, retryAfterSec };
  }

  return { allowed: true };
}

export function registerFailedAttempt(request: Request): void {
  const ip = ipFromRequest(request);
  const now = Date.now();
  const existing = attempts.get(ip);

  if (!existing || now - existing.firstAttempt > FAILED_WINDOW_MS) {
    attempts.set(ip, { count: 1, firstAttempt: now });
  } else {
    existing.count += 1;
  }
}

export function clearAttempts(ip?: string): void {
  if (ip) {
    attempts.delete(ip);
  } else {
    attempts.clear();
  }
}
