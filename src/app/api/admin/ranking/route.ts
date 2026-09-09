import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";
import { EVENTOS_REPRODUCCION, normalizarNombre } from "@/lib/analytics";
export const dynamic = "force-dynamic";

// GET ?slug=derecho-comercial&dias=30 — ranking de alumnos por interacción
// en esa materia (reproducciones + visitas). Para proponer premios.
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    const url = new URL(request.url);
    const slug = (url.searchParams.get("slug") || "derecho-comercial").trim();
    const diasParam = url.searchParams.get("dias");
    const dias = diasParam === "all" ? null : Number(diasParam) || 30;

    const supabase = getSupabaseAdmin();
    const desdeISO = dias ? new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString() : null;

    let q = supabase
      .from("actividad")
      .select("tipo, archivo_id, nombre, materia_slug, created_at")
      .eq("materia_slug", slug)
      .neq("tipo", "heartbeat")
      .not("nombre", "is", null)
      .order("created_at", { ascending: false })
      .limit(50000);
    if (desdeISO) q = q.gte("created_at", desdeISO);
    const { data, error } = await q;
    if (error) throw new Error(error.message);

    const porPersona = new Map<string, { nombre: string; visitas: number; reproducciones: number; ultima: string }>();
    for (const e of data || []) {
      const key = normalizarNombre(e.nombre);
      if (!key) continue;
      let p = porPersona.get(key);
      if (!p) {
        p = { nombre: (e.nombre || "").trim(), visitas: 0, reproducciones: 0, ultima: "" };
        porPersona.set(key, p);
      }
      if (e.tipo === "page_view") p.visitas += 1;
      if (e.archivo_id && EVENTOS_REPRODUCCION.has(e.tipo || "")) p.reproducciones += 1;
      if (e.created_at && e.created_at > p.ultima) p.ultima = e.created_at;
    }

    const ranking = [...porPersona.values()]
      .map((p) => ({ ...p, total: p.reproducciones + p.visitas }))
      .sort((a, b) => b.total - a.total || b.reproducciones - a.reproducciones)
      .slice(0, 20);

    // Marcar quién ya tiene algún grant (para no proponer duplicados a ciegas)
    const { data: grants } = await supabase.from("accesos_archivo").select("nombre");
    const conGrant = new Set((grants || []).map((g) => normalizarNombre(g.nombre)));

    return NextResponse.json({
      ok: true,
      slug,
      dias,
      ranking: ranking.map((r) => ({ ...r, conGrant: conGrant.has(normalizarNombre(r.nombre)) })),
    });
  } catch (e) {
    console.error("ranking GET:", e);
    return NextResponse.json({ ok: false, error: "Error al calcular ranking" }, { status: 500 });
  }
}
