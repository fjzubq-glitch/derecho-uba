import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const revalidate = 300; // Revalidar cada 5 minutos (ISR)

interface MateriaRow {
  id: string;
  nombre: string;
  slug: string;
  comision: string | null;
  catedra: string | null;
  anio: string | null;
  turno: string | null;
  estado: string | null;
  [key: string]: unknown;
}

interface MateriaWithRel extends MateriaRow {
  clases: { id: string }[] | null;
  materia_fechas: { id: string; titulo: string; fecha: string }[] | null;
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data } = await supabase
      .from("materias")
      .select(`
        *,
        clases ( id ),
        materia_fechas ( id, titulo, fecha )
      `)
      .order("nombre");

    const materias = (data || []) as MateriaWithRel[];

    const allClaseIds = materias.flatMap((m) => (m.clases || []).map((c) => c.id));

    const { data: archivos } = allClaseIds.length
      ? await supabase.from("archivos").select("clase_id, play_count").in("clase_id", allClaseIds)
      : { data: [] };

    const porClase = new Map<string, { count: number; plays: number }>();
    for (const a of archivos || []) {
      const cur = porClase.get(a.clase_id) || { count: 0, plays: 0 };
      cur.count += 1;
      cur.plays += a.play_count || 0;
      porClase.set(a.clase_id, cur);
    }

    const materiasConStats = materias.map((m) => ({
      ...m,
      total_clases: m.clases?.length || 0,
      total_audios: (m.clases || []).reduce((sum, c) => sum + (porClase.get(c.id)?.count || 0), 0),
      total_reproducciones: (m.clases || []).reduce((sum, c) => sum + (porClase.get(c.id)?.plays || 0), 0),
      clase_ids: (m.clases || []).map((c) => c.id),
      fechas: (m.materia_fechas || []).slice().sort((a, b) => String(a.fecha).localeCompare(String(b.fecha))),
    }));

    return NextResponse.json({
      materias: materiasConStats,
      stats: {
        clases: materiasConStats.reduce((s, m) => s + m.total_clases, 0),
        audios: materiasConStats.reduce((s, m) => s + m.total_audios, 0),
        reproducciones: materiasConStats.reduce((s, m) => s + m.total_reproducciones, 0),
      },
    });
  } catch {
    return NextResponse.json({ materias: [], stats: { clases: 0, audios: 0, reproducciones: 0 } });
  }
}
