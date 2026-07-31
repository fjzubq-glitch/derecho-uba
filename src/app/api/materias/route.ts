import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data: materias } = await supabase.from("materias").select("*").order("nombre");

    if (!materias) {
      return NextResponse.json({ materias: [] });
    }

    const materiasConStats = await Promise.all(
      materias.map(async (m) => {
        const { count: totalClases } = await supabase
          .from("clases").select("*", { count: "exact", head: true }).eq("materia_id", m.id);

        const { data: clasesIds } = await supabase
          .from("clases").select("id").eq("materia_id", m.id);

        const claseIds = clasesIds?.map((c) => c.id) || [];
        let totalAudios = 0;
        let totalRep = 0;

        if (claseIds.length > 0) {
          const { count } = await supabase
            .from("archivos").select("*", { count: "exact", head: true }).in("clase_id", claseIds);
          totalAudios = count || 0;
          const { data: archivos } = await supabase
            .from("archivos").select("play_count").in("clase_id", claseIds);
          totalRep = archivos?.reduce((sum, a) => sum + (a.play_count || 0), 0) || 0;
        }

        return {
          ...m,
          total_clases: totalClases || 0,
          total_audios: totalAudios,
          total_reproducciones: totalRep,
          clase_ids: claseIds,
        };
      })
    );

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
