import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data: materias } = await supabase.from("materias").select("*").order("nombre");

    const { count: clasesCount } = await supabase
      .from("clases").select("*", { count: "exact", head: true });

    const { count: archivosCount } = await supabase
      .from("archivos").select("*", { count: "exact", head: true });

    const { count: repCount } = await supabase
      .from("reproducciones").select("*", { count: "exact", head: true });

    // Activity
    const { data: allActivity } = await supabase
      .from("actividad")
      .select("ip_hash")
      .eq("tipo", "page_view");

    const uniqueIps = new Set(allActivity?.map((a: any) => a.ip_hash) || []);
    const visitantesUnicos = uniqueIps.size;
    const totalVisitas = allActivity?.length || 0;

    // Recent activity — sin join anidado (actividad no tiene FK); lookup por lotes
    const { data: recentActivity } = await supabase
      .from("actividad")
      .select("tipo, pagina, materia_slug, archivo_id, clase_id, created_at, ip_hash")
      .order("created_at", { ascending: false })
      .limit(30);

    const activityRows = recentActivity || [];
    const archivoIds = [...new Set(activityRows.map((a: any) => a.archivo_id).filter(Boolean))];
    const claseIds = [...new Set(activityRows.map((a: any) => a.clase_id).filter(Boolean))];

    const [{ data: archivoRows }, { data: claseRows }] = await Promise.all([
      archivoIds.length > 0
        ? supabase.from("archivos").select("id, nombre_display").in("id", archivoIds)
        : Promise.resolve({ data: [] }),
      claseIds.length > 0
        ? supabase.from("clases").select("id, numero, materias(nombre)").in("id", claseIds)
        : Promise.resolve({ data: [] }),
    ]);

    const archivoMap = new Map((archivoRows || []).map((a: any) => [a.id, a.nombre_display]));
    const claseMap = new Map((claseRows || []).map((c: any) => [c.id, c]));

    const actividadReciente = activityRows.map((a: any) => {
      const clase = claseMap.get(a.clase_id);
      return {
        tipo: a.tipo,
        pagina: a.pagina,
        materia_slug: a.materia_slug,
        archivo_nombre: a.archivo_id ? archivoMap.get(a.archivo_id) || null : null,
        materia: clase?.materias?.nombre || null,
        clase_numero: clase?.numero || null,
        created_at: a.created_at,
        ip_hash: a.ip_hash,
      };
    });

    // Popular content
    const { data: popularRows } = await supabase
      .from("archivos")
      .select("id, nombre_display, tipo, play_count, clase_id, clases!inner(numero, titulo, materias!inner(nombre))")
      .gt("play_count", 0)
      .order("play_count", { ascending: false })
      .limit(10);

    const contenidoPopular = (popularRows || []).map((a: any) => ({
      archivo_id: a.id,
      nombre_display: a.nombre_display,
      tipo: a.tipo,
      materia: a.clases?.materias?.nombre || "",
      clase_numero: a.clases?.numero || 0,
      clase_titulo: a.clases?.titulo || "",
      total_reproducciones: a.play_count || 0,
      usuarios_unicos: 0,
    }));

    // Daily visits (last 7 days)
    const { data: dailyData } = await supabase
      .from("actividad")
      .select("created_at, ip_hash")
      .eq("tipo", "page_view")
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const dayMap: Record<string, Set<string>> = {};
    (dailyData || []).forEach((d: any) => {
      const day = new Date(d.created_at).toLocaleDateString("es-AR");
      if (!dayMap[day]) dayMap[day] = new Set();
      dayMap[day].add(d.ip_hash);
    });
    const visitasPorDia = Object.entries(dayMap)
      .map(([fecha, ips]) => ({
        fecha,
        visitantes_unicos: (ips as Set<string>).size,
        total_visitas: (dailyData || []).filter((d: any) => new Date(d.created_at).toLocaleDateString("es-AR") === fecha).length,
      }))
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    return NextResponse.json({
      stats: {
        totalClases: clasesCount || 0,
        totalArchivos: archivosCount || 0,
        totalReproducciones: repCount || 0,
      },
      materias: materias || [],
      visitantesUnicos,
      totalVisitas,
      actividadReciente,
      contenidoPopular,
      visitasPorDia,
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
