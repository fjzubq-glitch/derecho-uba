import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hashIp } from "@/lib/hashIp";
import { ipFromRequest, isRateLimited } from "@/lib/simpleRateLimit";

const RATE_KEY = "analytics";
const RATE_MAX = 30;
const RATE_WINDOW_MS = 60 * 1000;

const ADMIN_NOMBRE = process.env.ADMIN_NOMBRE?.trim().toLowerCase();

export async function POST(request: NextRequest) {
  try {
    if (isRateLimited(`${RATE_KEY}:${ipFromRequest(request)}`, RATE_MAX, RATE_WINDOW_MS)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const { archivo_id, usuario } = body;

    if (!archivo_id) {
      return NextResponse.json({ error: "archivo_id required" }, { status: 400 });
    }

    // El admin no cuenta como alumno en las estadísticas
    const nombre = typeof usuario === "string" && usuario.trim() ? usuario.trim().slice(0, 40) : null;
    if (ADMIN_NOMBRE && nombre && nombre.toLowerCase() === ADMIN_NOMBRE) {
      return NextResponse.json({ ok: true, ignorado: true });
    }

    // Sin usuario identificado no se registra
    if (!nombre) {
      return NextResponse.json({ ok: true, ignorado: true });
    }

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0] || "unknown";
    const ipHash = await hashIp(ip);

    await getSupabaseAdmin().from("reproducciones").insert({
      archivo_id,
      ip_hash: ipHash,
    });

    await getSupabaseAdmin().rpc("increment_play_count", { file_id: archivo_id });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ ok: true }); // No fallar para el usuario
  }
}