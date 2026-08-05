import { NextRequest, NextResponse } from "next/server";
import { sessionCookieHeader } from "@/lib/auth";
import { checkRateLimit, registerFailedAttempt } from "@/lib/rateLimit";

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

    if (password === ADMIN_PASSWORD) {
      const response = NextResponse.json({ ok: true });
      response.headers.set("Set-Cookie", sessionCookieHeader());
      return response;
    }

    registerFailedAttempt(request);
    return NextResponse.json({ ok: false, error: "Contraseña incorrecta" }, { status: 401 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
