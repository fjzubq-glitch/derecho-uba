import { NextRequest, NextResponse } from "next/server";
import { sessionCookieHeader } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
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
    return NextResponse.json({ ok: false, error: "Contraseña incorrecta" }, { status: 401 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
