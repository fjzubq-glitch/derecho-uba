import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

const LIMITE = 6;

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data: clases } = await supabase
      .from("clases")
      .select("id, materia_id, numero, titulo, fecha, created_at")
      .order("created_at", { ascending: false })
      .limit(LIMITE);

    if (!clases || clases.length === 0) {
      return NextResponse.json({ recientes: [] });
    }

    const materiaIds = [...new Set(clases.map((c) => c.materia_id))];
    const { data: materias } = await supabase
      .from("materias")
      .select("id, nombre, slug")
      .in("id", materiaIds);

    const materiaMap = new Map((materias || []).map((m) => [m.id, m]));

    const claseIds = clases.map((c) => c.id);
    const { data: archivos } = await supabase
      .from("archivos")
      .select("clase_id, tipo")
      .in("clase_id", claseIds);

    const recursosPorClase = new Map<string, Set<string>>();
    for (const a of archivos || []) {
      if (!recursosPorClase.has(a.clase_id)) recursosPorClase.set(a.clase_id, new Set());
      recursosPorClase.get(a.clase_id)!.add(a.tipo);
    }

    const recientes = clases.map((c) => {
      const m = materiaMap.get(c.materia_id);
      const recursos = recursosPorClase.get(c.id) || new Set<string>();
      return {
        id: c.id,
        numero: c.numero,
        titulo: c.titulo,
        fecha: c.fecha,
        created_at: c.created_at,
        materia_id: c.materia_id,
        materia_nombre: m?.nombre?.split(",")[0]?.trim() || m?.nombre || "Sin materia",
        materia_slug: m?.slug || "",
        tiene_audio: recursos.has("audio_clase"),
        tiene_transcripcion: recursos.has("transcripcion"),
        tiene_podcast: recursos.has("podcast"),
        tiene_archivo: recursos.has("archivo") || recursos.has("enlace"),
      };
    });

    return NextResponse.json({ recientes });
  } catch {
    return NextResponse.json({ recientes: [] });
  }
}
