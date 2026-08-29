import { NextRequest, NextResponse } from "next/server";
import { sessionCookieHeader } from "@/lib/auth";
import { checkRateLimit, registerFailedAttempt } from "@/lib/rateLimit";
import { scryptSync, timingSafeEqual } from "node:crypto";

const AUTH_SALT = "derecho-uba-auth-salt-v1";

function hashPassword(pw: string): Buffer {
  return scryptSync(pw, AUTH_SALT, 64);
}

export async function POST(request: NextRequest) {
  try {
    const rate = checkRateLimit(request);
    if (!rate.allowed) {
      return NextResponse.json(
        { ok: false, error: "Demasiados intentos. Probá de nuevo más tarde." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec || 900) } }
      );
    }

    const body = await request.json();
    const password = String(body.password || "");

    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    if (!ADMIN_PASSWORD) {
      return NextResponse.json({ ok: false, error: "Configuración incompleta" }, { status: 500 });
    }

    const a = hashPassword(password);
    const b = hashPassword(ADMIN_PASSWORD);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      registerFailedAttempt(request);
      return NextResponse.json({ ok: false, error: "Contraseña incorrecta" }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.headers.set("Set-Cookie", sessionCookieHeader());
    return response;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
