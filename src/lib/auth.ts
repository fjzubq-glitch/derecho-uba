import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_COOKIE = "derecho_admin";
const SESSION_TTL = 60 * 60 * 24 * 30; // 30 días

function sessionSecret(): string {
  const secret = process.env.ADMIN_PASSWORD || "";
  if (!secret) {
    throw new Error("ADMIN_PASSWORD is not set");
  }
  return secret;
}

export function createSessionToken(): string {
  const secret = sessionSecret();
  const payload = {
    exp: Date.now() + SESSION_TTL * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [body, sig] = parts;
  const secret = sessionSecret();
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!timingSafeEqual(a, b)) return false;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.exp || Date.now() > payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}

export function getSessionToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!match) return null;
  return match.slice(SESSION_COOKIE.length + 1);
}

export function isAdminRequest(cookieHeader: string | null): boolean {
  return verifySessionToken(getSessionToken(cookieHeader));
}

export function sessionCookieHeader(): string {
  const token = createSessionToken();
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${SESSION_TTL}`;
}

export function clearSessionCookieHeader(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=0`;
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
