import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

const LIMITE = 6;

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data: podcasts } = await supabase
      .from("archivos")
      .select("id, clase_id, tipo, nombre_display, duration_seconds, created_at")
      .eq("tipo", "podcast")
      .order("created_at", { ascending: false })
      .limit(LIMITE);

    if (!podcasts || podcasts.length === 0) {
      return NextResponse.json({ podcasts: [] });
    }

    const claseIds = podcasts.map((p) => p.clase_id);
    const { data: clases } = await supabase
      .from("clases")
      .select("id, numero, titulo, materia_id")
      .in("id", claseIds);

    const claseMap = new Map((clases || []).map((c) => [c.id, c]));
    const materiaIds = [...new Set((clases || []).map((c) => c.materia_id))];

    const { data: materias } = await supabase
      .from("materias")
      .select("id, nombre, slug")
      .in("id", materiaIds);

    const materiaMap = new Map((materias || []).map((m) => [m.id, m]));

    const resultado = podcasts.map((p) => {
      const clase = claseMap.get(p.clase_id);
      const materia = clase ? materiaMap.get(clase.materia_id) : undefined;
      return {
        id: p.id,
        nombre: p.nombre_display,
        duration_seconds: p.duration_seconds,
        created_at: p.created_at,
        clase_numero: clase?.numero || null,
        clase_titulo: clase?.titulo || p.nombre_display,
        materia_slug: materia?.slug || "",
        materia_nombre: materia?.nombre?.split(",")[0]?.trim() || materia?.nombre || "Sin materia",
      };
    });

    return NextResponse.json({ podcasts: resultado });
  } catch {
    return NextResponse.json({ podcasts: [] });
  }
}
