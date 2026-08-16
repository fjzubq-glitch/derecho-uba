import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const supabase = getSupabaseAdmin();
    const desdeISO = new Date(Date.now() - 90 * 1000).toISOString();

    const [{ data: beats }, { data: materias }] = await Promise.all([
      supabase
        .from("actividad")
        .select("nombre, materia_slug, pagina, created_at")
        .eq("tipo", "heartbeat")
        .gte("created_at", desdeISO)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("materias").select("slug, nombre"),
    ]);

    const nombreMateria = new Map(
      (materias || []).map((m: { slug: string | null; nombre: string | null }) => [m.slug, m.nombre]),
    );

    const vistos = new Map<
      string,
      { nombre: string; materia_slug: string | null; materia_nombre: string; pagina: string | null; ultimo: string }
    >();
    for (const b of (beats || []) as Array<{
      nombre: string | null;
      materia_slug: string | null;
      pagina: string | null;
      created_at: string | null;
    }>) {
      const n = (b.nombre || "").trim();
      if (!n || vistos.has(n)) continue;
      vistos.set(n, {
        nombre: n,
        materia_slug: b.materia_slug,
        materia_nombre: b.materia_slug ? nombreMateria.get(b.materia_slug) || "" : "",
        pagina: b.pagina,
        ultimo: b.created_at || "",
      });
    }

    const enLinea = [...vistos.values()].sort((a, b) => (a.ultimo < b.ultimo ? 1 : -1));

    return NextResponse.json({ enLinea, total: enLinea.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}