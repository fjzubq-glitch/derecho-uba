import { NextRequest, NextResponse } from "next/server";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Soyapango503";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const password = String(body.password || "");

    if (password === ADMIN_PASSWORD) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: "Contraseña incorrecta" }, { status: 401 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
