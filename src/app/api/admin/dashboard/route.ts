import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";
import { calcularPopCounts, calcularResumen, type EventoAnalitico, type MateriaAnalitica } from "@/lib/analytics";

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

    const [{ data: materias }, { count: clasesCount }, { count: archivosCount }, { data: archivos }] =
      await Promise.all([
        supabase.from("materias").select("*").order("nombre"),
        supabase.from("clases").select("*", { count: "exact", head: true }),
        supabase.from("archivos").select("*", { count: "exact", head: true }),
        supabase.from("archivos").select("id, tipo"),
      ]);

    const tipoPorArchivo = new Map((archivos || []).map((a) => [a.id, a.tipo]));

    // Todos los eventos del período (visitas, reproducciones, aperturas)
    // Los heartbeats (presencia) se excluyen: solo ensucian el volumen
    let eventsQuery = supabase
      .from("actividad")
      .select("tipo, archivo_id, clase_id, nombre, materia_slug, created_at, ip_hash")
      .neq("tipo", "heartbeat")
      .order("created_at", { ascending: false })
      .limit(100000);
    if (desdeISO) eventsQuery = eventsQuery.gte("created_at", desdeISO);
    const { data: eventosData } = await eventsQuery;
    const eventos = (eventosData || []) as EventoAnalitico[];

    // Registros nuevos: consulta aparte (solo este tipo), sin que el límite
    // de 100k del query general trunque los eventos más viejos
    let nuevosQuery = supabase
      .from("actividad")
      .select("nombre")
      .eq("tipo", "usuario_registrado")
      .limit(100000);
    if (desdeISO) nuevosQuery = nuevosQuery.gte("created_at", desdeISO);
    const { data: registrosNuevos } = await nuevosQuery;
    const alumnosNuevos = new Set(
      (registrosNuevos || []).map((r) => (r.nombre || "").trim()).filter(Boolean),
    ).size;

    const resumen = calcularResumen(eventos, tipoPorArchivo, (materias || []) as MateriaAnalitica[]);

    // ── Contenido más popular ──
    const popCounts = calcularPopCounts(eventos);
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
      const { data: popArchivoRows } = await supabase
        .from("archivos")
        .select("id, nombre_display, tipo, clase_id")
        .in("id", popIds);
      const claseIdsPop = [...new Set((popArchivoRows || []).map((a) => a.clase_id).filter(Boolean) as string[])];
      const { data: popClaseRowsSupabase } = claseIdsPop.length > 0
        ? await supabase
            .from("clases")
            .select("id, numero, titulo, materias!inner(nombre)")
            .in("id", claseIdsPop)
        : { data: null };
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

    return NextResponse.json({
      stats: {
        totalClases: clasesCount || 0,
        totalArchivos: archivosCount || 0,
        totalReproducciones: resumen.totalReproducciones,
      },
      materias: materias || [],
      visitantesUnicos: resumen.visitantesUnicos,
      totalVisitas: resumen.totalVisitas,
      alumnosActivos: resumen.alumnosActivos,
      alumnosNuevos,
      estudiantes: resumen.estudiantes,
      contenidoPorTipo: resumen.contenidoPorTipo,
      materiasStats: resumen.materiasStats,
      contenidoPopular,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
