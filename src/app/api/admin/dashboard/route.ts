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

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const supabase = getSupabaseAdmin();

    const url = new URL(request.url);
    const diasParam = url.searchParams.get("dias");
    const dias = diasParam === "all" ? null : diasParam === "30" ? 30 : 7;

    const now = Date.now();
    const desdeISO = dias ? new Date(now - dias * 24 * 60 * 60 * 1000).toISOString() : null;
    const prevDesdeISO = dias ? new Date(now - 2 * dias * 24 * 60 * 60 * 1000).toISOString() : null;

    const { data: materias } = await supabase.from("materias").select("*").order("nombre");

    const { count: clasesCount } = await supabase
      .from("clases").select("*", { count: "exact", head: true });

    const { count: archivosCount } = await supabase
      .from("archivos").select("*", { count: "exact", head: true });

    let repQuery = supabase.from("reproducciones").select("*", { count: "exact", head: true });
    if (desdeISO) repQuery = repQuery.gte("created_at", desdeISO);
    const { count: repCount } = await repQuery;

    let prevRepQuery = supabase.from("reproducciones").select("*", { count: "exact", head: true });
    if (dias) prevRepQuery = prevRepQuery.gte("created_at", prevDesdeISO!).lt("created_at", desdeISO!);
    const { count: prevRepCount } = await prevRepQuery;

    // Activity (visitas)
    let pageQuery = supabase.from("actividad").select("ip_hash").eq("tipo", "page_view");
    if (desdeISO) pageQuery = pageQuery.gte("created_at", desdeISO);
    const { data: allActivity } = await pageQuery as { data: Array<{ ip_hash: string | null }> | null };

    const uniqueIps = new Set((allActivity || []).map((a) => a.ip_hash).filter(Boolean) as string[]);
    const visitantesUnicos = uniqueIps.size;
    const totalVisitas = (allActivity || []).length;

    // Tendencia: período anterior
    let prevPageQuery = supabase.from("actividad").select("*", { count: "exact", head: true }).eq("tipo", "page_view");
    if (dias) prevPageQuery = prevPageQuery.gte("created_at", prevDesdeISO!).lt("created_at", desdeISO!);
    const { count: prevPageViews } = await prevPageQuery;
    const tendenciaVisitas =
      prevPageViews && prevPageViews > 0
        ? Math.round(((totalVisitas - prevPageViews) / prevPageViews) * 100)
        : totalVisitas > 0
          ? 100
          : 0;
    const tendenciaReproducciones =
      prevRepCount && prevRepCount > 0
        ? Math.round(((repCount || 0) - prevRepCount) / prevRepCount * 100)
        : (repCount || 0) > 0
          ? 100
          : 0;

    // Recent activity — sin join anidado (actividad no tiene FK); lookup por lotes
    let recentQuery = supabase
      .from("actividad")
      .select("tipo, pagina, materia_slug, archivo_id, clase_id, created_at, ip_hash")
      .order("created_at", { ascending: false })
      .limit(30);
    if (desdeISO) recentQuery = recentQuery.gte("created_at", desdeISO);
    const { data: recentActivity } = await recentQuery;

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

    // Popular content (dentro del período, desde actividad)
    let popQuery = supabase
      .from("actividad")
      .select("archivo_id")
      .in("tipo", ["play_start", "youtube_open"])
      .not("archivo_id", "is", null)
      .limit(5000);
    if (desdeISO) popQuery = popQuery.gte("created_at", desdeISO);
    const { data: popEvents } = await popQuery as { data: Array<{ archivo_id: string }> | null };

    const popCounts = new Map<string, number>();
    (popEvents || []).forEach((p) => {
      if (p.archivo_id) popCounts.set(p.archivo_id, (popCounts.get(p.archivo_id) || 0) + 1);
    });
    const popIds = [...popCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id]) => id);

    let contenidoPopular: Array<{
      archivo_id: string;
      nombre_display: string;
      tipo: string;
      materia: string;
      clase_numero: number;
      clase_titulo: string;
      total_reproducciones: number;
    }> = [];
    if (popIds.length > 0) {
      const [{ data: popArchivoRows }, { data: popClaseRowsSupabase }] = await Promise.all([
        supabase.from("archivos").select("id, nombre_display, tipo, clase_id").in("id", popIds),
        supabase.from("clases").select("id, numero, titulo, materias!inner(nombre)").in(
          "id",
          popIds,
        ),
      ]);
      const popArchivoMap = new Map((popArchivoRows || []).map((a) => [a.id, a]));
      const popClaseMap = new Map((popClaseRowsSupabase || []).map((c) => [c.id, c]));
      contenidoPopular = popIds.map((id) => {
        const archivo = popArchivoMap.get(id);
        const clase = archivo?.clase_id ? popClaseMap.get(archivo.clase_id) : undefined;
        return {
          archivo_id: id,
          nombre_display: archivo?.nombre_display || "",
          tipo: archivo?.tipo || "",
          materia: (clase?.materias as { nombre?: string } | undefined)?.nombre || "",
          clase_numero: clase?.numero || 0,
          clase_titulo: clase?.titulo || "",
          total_reproducciones: popCounts.get(id) || 0,
        };
      });
    }

    // Daily visits — días consecutivos dentro del período (máx. 14 barras)
    const diasGrafico = dias ? Math.min(dias, 14) : 14;
    const chartDesde = new Date(now - diasGrafico * 24 * 60 * 60 * 1000).toISOString();
    const { data: dailyData } = await supabase
      .from("actividad")
      .select("created_at, ip_hash")
      .eq("tipo", "page_view")
      .gte("created_at", chartDesde);

    const dailyRows = (dailyData || []) as DailyRow[];
    const visitasPorDia: Array<{
      fecha: string;
      label: string;
      total_visitas: number;
      visitantes_unicos: number;
    }> = [];
    for (let i = diasGrafico - 1; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const fechaKey = d.toLocaleDateString("es-AR");
      const rowsDia = dailyRows.filter((r) =>
        r.created_at && new Date(r.created_at).toLocaleDateString("es-AR") === fechaKey,
      );
      visitasPorDia.push({
        fecha: fechaKey,
        label: d.toLocaleDateString("es-AR", { day: "numeric", month: "short" }).replace(".", ""),
        total_visitas: rowsDia.length,
        visitantes_unicos: new Set(rowsDia.map((r) => r.ip_hash || "unknown")).size,
      });
    }

    // Estudiantes registrados (por nombre)
    let userQuery = supabase
      .from("actividad")
      .select("nombre, created_at, tipo, materia_slug")
      .not("nombre", "is", null)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (desdeISO) userQuery = userQuery.gte("created_at", desdeISO);
    const { data: userActivity } = await userQuery;

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

    const estudiantesActivos = estudiantes.filter((e) => e.reproducciones > 0).length;
    const compromiso = estudiantes.length > 0
      ? Math.round((estudiantesActivos / estudiantes.length) * 100)
      : 0;

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

    // Horas de estudio (dentro del período)
    let horasQuery = supabase.from("actividad").select("created_at").limit(10000);
    if (desdeISO) horasQuery = horasQuery.gte("created_at", desdeISO);
    const { data: horasData } = await horasQuery as { data: Array<{ created_at: string | null }> | null };
    const horasEstudio = new Array(24).fill(0) as number[];
    (horasData || []).forEach((h) => {
      if (h.created_at) horasEstudio[new Date(h.created_at).getHours()] += 1;
    });

    return NextResponse.json({
      stats: {
        totalClases: clasesCount || 0,
        totalArchivos: archivosCount || 0,
        totalReproducciones: repCount || 0,
      },
      materias: materias || [],
      visitantesUnicos,
      totalVisitas,
      tendenciaVisitas,
      tendenciaReproducciones,
      compromiso,
      estudiantes,
      materiasStats,
      actividadReciente,
      contenidoPopular,
      visitasPorDia,
      horasEstudio,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
