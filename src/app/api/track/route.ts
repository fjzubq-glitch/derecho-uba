import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hashIp } from "@/lib/hashIp";
import { ipFromRequest, isRateLimited } from "@/lib/simpleRateLimit";
export const dynamic = "force-dynamic";


const RATE_KEY = "track";
const RATE_MAX = 120;
const RATE_WINDOW_MS = 60 * 1000;

// Server-only: se prefiere ADMIN_NOMBRE (privada) y se cae a la pública por compatibilidad.
const ADMIN_NOMBRE = (process.env.ADMIN_NOMBRE || process.env.NEXT_PUBLIC_ADMIN_NOMBRE || "").trim().toLowerCase();

export async function POST(request: NextRequest) {
  try {
    if (isRateLimited(`${RATE_KEY}:${ipFromRequest(request)}`, RATE_MAX, RATE_WINDOW_MS)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const { tipo, pagina, materia_slug, clase_id, archivo_id, metadata, usuario } = body;

    if (!tipo) {
      return NextResponse.json({ error: "tipo required" }, { status: 400 });
    }

    const nombre = typeof usuario === "string" && usuario.trim() ? usuario.trim().slice(0, 40) : null;

    // El admin no cuenta como alumno en las estadísticas
    if (ADMIN_NOMBRE && nombre && nombre.toLowerCase() === ADMIN_NOMBRE) {
      return NextResponse.json({ ok: true, ignorado: true });
    }

    // Sin usuario identificado no se registra: evita contar visitas anónimas
    // (home, cartel de bienvenida sin completar, etc.)
    if (!nombre) {
      return NextResponse.json({ ok: true, ignorado: true });
    }

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0] || "unknown";
    const ipHash = await hashIp(ip);
    const userAgent = request.headers.get("user-agent") || "";

    await getSupabaseAdmin().from("actividad").insert({
      tipo,
      pagina: pagina || null,
      materia_slug: materia_slug || null,
      clase_id: clase_id || null,
      archivo_id: archivo_id || null,
      metadata: metadata || null,
      ip_hash: ipHash,
      user_agent: userAgent,
      nombre,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Track error:", error);
    return NextResponse.json({ ok: true }); // No fallar para el usuario
  }
}