import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tipo, pagina, materia_slug, clase_id, archivo_id, metadata } = body;

    if (!tipo) {
      return NextResponse.json({ error: "tipo required" }, { status: 400 });
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
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Track error:", error);
    return NextResponse.json({ ok: true }); // No fallar para el usuario
  }
}

async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + (process.env.IP_SALT || "derecho-uba-salt"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
