import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";

interface ActivityRow {
  tipo: string | null;
  pagina: string | null;
  materia_slug: string | null;
  archivo_id: string | null;
  clase_id: string | null;
  created_at: string | null;
  ip_hash: string | null;
}

interface ArchivoRow {
  id: string;
  nombre_display: string | null;
}

interface ClaseRow {
  id: string;
  numero: number | null;
  materias?: { nombre: string | null } | null;
}

interface DailyRow {
  created_at: string | null;
  ip_hash: string | null;
}

interface PopularRow {
  id: string;
  nombre_display: string | null;
  tipo: string | null;
  play_count: number | null;
  clases?: {
    numero: number | null;
    titulo: string | null;
    materias?: { nombre: string | null } | null;
  } | null;
}

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
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
      .eq("tipo", "page_view") as { data: Array<{ ip_hash: string | null }> | null };

    const uniqueIps = new Set((allActivity || []).map((a) => a.ip_hash).filter(Boolean) as string[]);
    const visitantesUnicos = uniqueIps.size;
    const totalVisitas = (allActivity || []).length;

    // Recent activity — sin join anidado (actividad no tiene FK); lookup por lotes
    const { data: recentActivity } = await supabase
      .from("actividad")
      .select("tipo, pagina, materia_slug, archivo_id, clase_id, created_at, ip_hash")
      .order("created_at", { ascending: false })
      .limit(30);

    const activityRows = (recentActivity || []) as ActivityRow[];
    const archivoIds = [...new Set(activityRows.map((a) => a.archivo_id).filter(Boolean) as string[])];
    const claseIds = [...new Set(activityRows.map((a) => a.clase_id).filter(Boolean) as string[])];

    const [{ data: archivoRows }, { data: claseRowsSupabase }] = await Promise.all([
      archivoIds.length > 0
        ? supabase.from("archivos").select("id, nombre_display").in("id", archivoIds)
        : Promise.resolve({ data: [] }),
      claseIds.length > 0
        ? supabase.from("clases").select("id, numero, materias(nombre)").in("id", claseIds)
        : Promise.resolve({ data: [] }),
    ]);

    const archivoRowsTyped = (archivoRows || []) as unknown as ArchivoRow[];
    const claseRowsTyped = (claseRowsSupabase || []) as unknown as ClaseRow[];

    const archivoMap = new Map(archivoRowsTyped.map((a) => [a.id, a.nombre_display]));
    const claseMap = new Map(claseRowsTyped.map((c) => [c.id, c]));

    const actividadReciente = activityRows.map((a) => {
      const clase = a.clase_id ? claseMap.get(a.clase_id) : undefined;
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

    const contenidoPopular = ((popularRows || []) as unknown as PopularRow[]).map((a) => ({
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

    const dailyRows = (dailyData || []) as DailyRow[];

    // Estudiantes registrados (por nombre)
    const { data: userActivity } = await supabase
      .from("actividad")
      .select("nombre, created_at, tipo, materia_slug")
      .not("nombre", "is", null)
      .order("created_at", { ascending: false })
      .limit(2000);

    const userMap: Record<string, { nombre: string; visitas: number; ultima_actividad: string; materias: Set<string>; reproducciones: number }> = {};
    (userActivity || []).forEach((a: { nombre: string | null; created_at: string | null; tipo: string | null; materia_slug: string | null }) => {
      const n = a.nombre || "";
      if (!n) return;
      if (!userMap[n]) {
        userMap[n] = { nombre: n, visitas: 0, ultima_actividad: a.created_at || "", materias: new Set(), reproducciones: 0 };
      }
      userMap[n].visitas += 1;
      if (a.materia_slug) userMap[n].materias.add(a.materia_slug);
      if (a.tipo === "play_start" || a.tipo === "youtube_open") userMap[n].reproducciones += 1;
      if (a.created_at && (!userMap[n].ultima_actividad || a.created_at > userMap[n].ultima_actividad)) {
        userMap[n].ultima_actividad = a.created_at;
      }
    });

    const estudiantes = Object.values(userMap)
      .map((u) => ({
        nombre: u.nombre,
        visitas: u.visitas,
        ultima_actividad: u.ultima_actividad,
        materias: u.materias.size,
        reproducciones: u.reproducciones,
      }))
      .sort((a, b) => b.visitas - a.visitas);

    // Actividad por materia
    const materiaAgg: Record<string, { visitas: number; estudiantes: Set<string>; reproducciones: number }> = {};
    (userActivity || []).forEach((a: { nombre: string | null; tipo: string | null; materia_slug: string | null }) => {
      const slug = a.materia_slug;
      if (!slug) return;
      if (!materiaAgg[slug]) materiaAgg[slug] = { visitas: 0, estudiantes: new Set(), reproducciones: 0 };
      const m = materiaAgg[slug];
      if (a.tipo === "page_view") m.visitas += 1;
      if (a.tipo === "play_start" || a.tipo === "youtube_open") m.reproducciones += 1;
      if (a.nombre) m.estudiantes.add(a.nombre);
    });

    const materiasStats = ((materias || []) as Array<{ id: string; nombre: string | null; slug: string | null; total_clases?: number }>)
      .map((mat) => {
        const agg = materiaAgg[mat.slug || ""] || { visitas: 0, estudiantes: new Set(), reproducciones: 0 };
        return {
          id: mat.id,
          nombre: mat.nombre || "",
          total_clases: mat.total_clases || 0,
          visitas: agg.visitas,
          estudiantes: agg.estudiantes.size,
          reproducciones: agg.reproducciones,
        };
      })
      .sort((a, b) => b.visitas - a.visitas || b.reproducciones - a.reproducciones);

    const dayMap: Record<string, Set<string>> = {};
    dailyRows.forEach((d) => {
      const day = d.created_at ? new Date(d.created_at).toLocaleDateString("es-AR") : "sin fecha";
      if (!dayMap[day]) dayMap[day] = new Set();
      dayMap[day].add(d.ip_hash || "unknown");
    });
    const visitasPorDia = Object.entries(dayMap)
      .map(([fecha, ips]) => ({
        fecha,
        visitantes_unicos: ips.size,
        total_visitas: dailyRows.filter((d) => {
          const f = d.created_at ? new Date(d.created_at).toLocaleDateString("es-AR") : "sin fecha";
          return f === fecha;
        }).length,
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
      estudiantes,
      materiasStats,
      actividadReciente,
      contenidoPopular,
      visitasPorDia,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}