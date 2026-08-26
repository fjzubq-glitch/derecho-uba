export interface EventoAnalitico {
  tipo: string | null;
  archivo_id: string | null;
  clase_id: string | null;
  nombre: string | null;
  materia_slug: string | null;
  created_at: string | null;
  ip_hash: string | null;
}

export interface MateriaAnalitica {
  id: string;
  nombre: string | null;
  slug: string | null;
  total_clases?: number;
}

export const EVENTOS_REPRODUCCION = new Set(["play_start", "youtube_open"]);
export const CONTENIDO_TIPOS = ["audio_clase", "clase_youtube", "video_resumen", "transcripcion", "archivo", "enlace", "cuestionario"];

export function normalizarNombre(n: string | null | undefined): string {
  return (n || "").trim().toLowerCase();
}

export function calcularResumen(
  eventos: EventoAnalitico[],
  tipoPorArchivo: Map<string, string | null>,
  materias: MateriaAnalitica[],
) {
  // ── Métricas generales ──
  const visitas = eventos.filter((e) => e.tipo === "page_view" && (e.nombre || "").trim().length > 0);
  const totalVisitas = visitas.length;
  const visitantesUnicos = new Set(visitas.map((v) => normalizarNombre(v.nombre))).size;

  const reproducciones = eventos.filter((e) => e.archivo_id && EVENTOS_REPRODUCCION.has(e.tipo || ""));
  const totalReproducciones = reproducciones.length;

  const materiaNombreMap = new Map(
    materias
      .filter((m) => m.slug)
      .map((m) => [m.slug as string, m.nombre || ""]),
  );

  // ── Contenido consumido por tipo (con materia de cada elemento) ──
  const tipoMateriaAgg: Record<string, Record<string, { accesos: number; personas: Set<string> }>> = {};
  for (const e of eventos) {
    if (e.archivo_id) {
      const t = tipoPorArchivo.get(e.archivo_id);
      if (!t) continue;
      const slug = e.materia_slug || "";
      const agg = (tipoMateriaAgg[t] = tipoMateriaAgg[t] || {});
      const m = (agg[slug] = agg[slug] || { accesos: 0, personas: new Set() });
      m.accesos += 1;
      const key = normalizarNombre(e.nombre);
      if (key) m.personas.add(key);
    }
  }

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
    { nombre: string; visitas: number; clasesSet: Set<string>; materias: Set<string>; porTipo: Record<string, number>; ultima_actividad: string }
  > = {};
  for (const e of eventos) {
    const key = normalizarNombre(e.nombre);
    if (!key) continue;
    const p = personasMap[key] || (personasMap[key] = { nombre: (e.nombre || "").trim(), visitas: 0, clasesSet: new Set(), materias: new Set(), porTipo: {}, ultima_actividad: "" });
    if (e.tipo === "page_view") p.visitas += 1;
    if (e.tipo === "class_view" && e.clase_id) p.clasesSet.add(e.clase_id);
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
      clasesVistas: p.clasesSet.size,
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
    if (e.tipo === "page_view" && (e.nombre || "").trim().length > 0) m.visitas += 1;
    if (e.archivo_id && EVENTOS_REPRODUCCION.has(e.tipo || "")) m.reproducciones += 1;
    if (e.archivo_id) {
      const t = tipoPorArchivo.get(e.archivo_id);
      if (t) m.porTipo[t] = (m.porTipo[t] || 0) + 1;
    }
    if (e.nombre) m.estudiantes.add(normalizarNombre(e.nombre));
  }

  const materiasStats = materias
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

  return { totalVisitas, visitantesUnicos, totalReproducciones, contenidoPorTipo, estudiantes, alumnosActivos, materiasStats };
}

export function calcularPopCounts(eventos: EventoAnalitico[]): Map<string, number> {
  const popCounts = new Map<string, number>();
  for (const e of eventos) {
    if (e.archivo_id && EVENTOS_REPRODUCCION.has(e.tipo || "")) {
      popCounts.set(e.archivo_id, (popCounts.get(e.archivo_id) || 0) + 1);
    }
  }
  return popCounts;
}
