import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";

interface Evento {
  tipo: string | null;
  archivo_id: string | null;
  nombre: string | null;
  materia_slug: string | null;
  created_at: string | null;
  ip_hash: string | null;
}

const EVENTOS_REPRODUCCION = new Set(["play_start", "youtube_open"]);

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
      .select("tipo, archivo_id, nombre, materia_slug, created_at, ip_hash")
      .neq("tipo", "heartbeat")
      .order("created_at", { ascending: false })
      .limit(100000);
    if (desdeISO) eventsQuery = eventsQuery.gte("created_at", desdeISO);
    const { data: eventosData } = await eventsQuery;
    const eventos = (eventosData || []) as Evento[];

    // ── Métricas generales ──
    const visitas = eventos.filter((e) => e.tipo === "page_view");
    const totalVisitas = visitas.length;
    const visitantesUnicos = new Set(visitas.map((v) => v.ip_hash).filter(Boolean) as string[]).size;

    const reproducciones = eventos.filter((e) => e.archivo_id && EVENTOS_REPRODUCCION.has(e.tipo || ""));
    const totalReproducciones = reproducciones.length;

    const alumnosNuevos = new Set(
      eventos.filter((e) => e.tipo === "usuario_registrado").map((e) => (e.nombre || "").trim()).filter(Boolean),
    ).size;

    // ── Contenido consumido por tipo (con materia de cada elemento) ──
    const materiaNombreMap = new Map(
      ((materias || []) as Array<{ slug: string | null; nombre: string | null }>)
        .filter((m) => m.slug)
        .map((m) => [m.slug as string, m.nombre || ""]),
    );

    const tipoMateriaAgg: Record<string, Record<string, { accesos: number; personas: Set<string> }>> = {};
    for (const e of eventos) {
      if (!e.archivo_id) continue;
      const t = tipoPorArchivo.get(e.archivo_id);
      if (!t) continue;
      const slug = e.materia_slug || "";
      const agg = (tipoMateriaAgg[t] = tipoMateriaAgg[t] || {});
      const m = (agg[slug] = agg[slug] || { accesos: 0, personas: new Set() });
      m.accesos += 1;
      if (e.nombre) m.personas.add(e.nombre);
    }

    const CONTENIDO_TIPOS = ["audio_clase", "clase_youtube", "podcast", "transcripcion", "archivo", "enlace"];
    const contenidoPorTipo = CONTENIDO_TIPOS.map((tipo) => {
      const porMateria = Object.entries(tipoMateriaAgg[tipo] || {})
        .map(([slug, agg]) => ({
          slug,
          materia: slug ? materiaNombreMap.get(slug) || "" : "",
          accesos: agg.accesos,
          personas: agg.personas.size,
        }))
        .filter((m) => m.materia)
        .sort((a, b) => b.accesos - a.accesos);
      const accesos = porMateria.reduce((a, m) => a + m.accesos, 0);
      const personas = new Set(
        Object.values(tipoMateriaAgg[tipo] || {}).flatMap((m) => [...m.personas]),
      ).size;
      return { tipo, accesos, personas, materias: porMateria };
    });

    // ── Por persona: qué miró y cuánto ──
    const personasMap: Record<
      string,
      { nombre: string; visitas: number; clasesVistas: number; materias: Set<string>; porTipo: Record<string, number>; ultima_actividad: string }
    > = {};
    for (const e of eventos) {
      const n = (e.nombre || "").trim();
      if (!n) continue;
      const p = personasMap[n] || (personasMap[n] = { nombre: n, visitas: 0, clasesVistas: 0, materias: new Set(), porTipo: {}, ultima_actividad: "" });
      if (e.tipo === "page_view") p.visitas += 1;
      if (e.tipo === "class_view") p.clasesVistas += 1;
      if (e.materia_slug) p.materias.add(e.materia_slug);
      if (e.archivo_id) {
        const t = tipoPorArchivo.get(e.archivo_id);
        if (t) p.porTipo[t] = (p.porTipo[t] || 0) + 1;
      }
      if (e.created_at && e.created_at > p.ultima_actividad) p.ultima_actividad = e.created_at;
    }

    const estudiantes = Object.values(personasMap)
      .map((p) => ({
        nombre: p.nombre,
        visitas: p.visitas,
        clasesVistas: p.clasesVistas,
        materias: p.materias.size,
        porTipo: p.porTipo,
        total: Object.values(p.porTipo).reduce((a, b) => a + b, 0),
        ultima_actividad: p.ultima_actividad,
      }))
      .sort((a, b) => b.total - a.total || b.visitas - a.visitas);

    const alumnosActivos = estudiantes.filter((e) => e.total > 0).length;

    // ── Actividad por materia ──
    const materiaAgg: Record<
      string,
      { visitas: number; estudiantes: Set<string>; reproducciones: number; porTipo: Record<string, number> }
    > = {};
    for (const e of eventos) {
      if (!e.materia_slug) continue;
      const m = materiaAgg[e.materia_slug] || (materiaAgg[e.materia_slug] = { visitas: 0, estudiantes: new Set(), reproducciones: 0, porTipo: {} });
      if (e.tipo === "page_view") m.visitas += 1;
      if (e.archivo_id && EVENTOS_REPRODUCCION.has(e.tipo || "")) m.reproducciones += 1;
      if (e.archivo_id) {
        const t = tipoPorArchivo.get(e.archivo_id);
        if (t) m.porTipo[t] = (m.porTipo[t] || 0) + 1;
      }
      if (e.nombre) m.estudiantes.add(e.nombre);
    }

    const materiasStats = ((materias || []) as Array<{ id: string; nombre: string | null; slug: string | null; total_clases?: number }>)
      .map((mat) => {
        const agg = materiaAgg[mat.slug || ""] || { visitas: 0, estudiantes: new Set(), reproducciones: 0, porTipo: {} };
        const total = Object.values(agg.porTipo).reduce((a, b) => a + b, 0);
        return {
          id: mat.id,
          nombre: mat.nombre || "",
          total_clases: mat.total_clases || 0,
          visitas: agg.visitas,
          estudiantes: agg.estudiantes.size,
          reproducciones: agg.reproducciones,
          porTipo: agg.porTipo,
          consumo: total,
        };
      })
      .sort((a, b) => b.consumo - a.consumo || b.visitas - a.visitas);

    // ── Contenido más popular ──
    const popCounts = new Map<string, number>();
    for (const e of reproducciones) {
      if (e.archivo_id) popCounts.set(e.archivo_id, (popCounts.get(e.archivo_id) || 0) + 1);
    }
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
        totalReproducciones,
      },
      materias: materias || [],
      visitantesUnicos,
      totalVisitas,
      alumnosActivos,
      alumnosNuevos,
      estudiantes,
      contenidoPorTipo,
      materiasStats,
      contenidoPopular,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
