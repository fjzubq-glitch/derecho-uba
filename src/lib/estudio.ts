import { getSupabaseAdmin } from "@/lib/supabase";

export type TipoRevision = "inicial" | "repaso1" | "repaso2" | "repaso3" | "examen_repaso" | "examen_vistazo";

export interface Revision {
  id: string;
  materia_id: string | null;
  clase_id: string | null;
  exam_date_id: string | null;
  tipo: TipoRevision;
  fecha_programada: string;
  hecha: boolean;
  completada_at: string | null;
}

// Fecha local Argentina en formato YYYY-MM-DD
export function hoyLocal(now = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(now);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
}

export function addDays(fechaISO: string, dias: number): string {
  const [y, m, d] = fechaISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + dias);
  return dt.toISOString().slice(0, 10);
}

// Esquema de repaso por clase: estudio al subir + 3/7/21 días
const CLASE_ITEMS: Array<{ tipo: TipoRevision; offset: number }> = [
  { tipo: "inicial", offset: 0 },
  { tipo: "repaso1", offset: 3 },
  { tipo: "repaso2", offset: 7 },
  { tipo: "repaso3", offset: 21 },
];

// Esquema de refuerzo pre-examen: 5 días antes y 1 día antes
const EXAMEN_ITEMS: Array<{ tipo: TipoRevision; offset: number }> = [
  { tipo: "examen_repaso", offset: -5 },
  { tipo: "examen_vistazo", offset: -1 },
];

interface ClaseConMateria {
  id: string;
  numero: number;
  titulo: string;
  materia_id: string;
}

// Crea (de forma idempotente) las revisiones para todas las clases que ya tienen
// contenido subido. Se invoca en la API de estudio y en el cron. Devuelve cuántas
// revisiones nuevas se crearon.
export async function sincronizarRevisiones(): Promise<{ creadas: number }> {
  const supabase = getSupabaseAdmin();
  const hoy = hoyLocal();
  let creadas = 0;

  // 1) Clases con material subido (materia + numero para linkear)
  const { data: clasesConArchivos } = await supabase
    .from("clases")
    .select("id, numero, titulo, materia_id");

  const ids = (clasesConArchivos || []).map((c) => c.id);
  if (ids.length === 0) return { creadas };

  const { data: archivos } = await supabase
    .from("archivos")
    .select("clase_id, created_at")
    .in("clase_id", ids)
    .not("tipo", "eq", "podcast");

  const claseConContenido = new Set<string>((archivos || []).map((a) => a.clase_id));
  const soloClases = (clasesConArchivos || []).filter((c) => claseConContenido.has(c.id));

  for (const c of soloClases) {
    // Fecha de base: la más temprana de subida de contenido de esa clase
    const fechas = (archivos || [])
      .filter((a) => a.clase_id === c.id)
      .map((a) => String(a.created_at).slice(0, 10))
      .filter(Boolean)
      .sort();
    const base = fechas[0] || hoy;

    for (const item of CLASE_ITEMS) {
      const fecha = addDays(base, item.offset);
      if (fecha > hoy) continue; // si la fecha ya pasó, igual la creamos para historial
      const { error } = await supabase
        .from("estudio_revisiones")
        .upsert(
          { materia_id: c.materia_id, clase_id: c.id, tipo: item.tipo, fecha_programada: fecha },
          { onConflict: "clase_id,tipo", ignoreDuplicates: true }
        );
      if (!error) creadas++;
    }
  }

  // 2) Refuerzo pre-examen desde materia_fechas (parciales/finales/exámenes)
  const { data: fechasExam } = await supabase
    .from("materia_fechas")
    .select("id, materia_id, titulo, fecha")
    .gte("fecha", hoy);

  for (const e of (fechasExam || [])) {
    for (const item of EXAMEN_ITEMS) {
      const fecha = addDays(String(e.fecha), item.offset);
      if (fecha < hoy) continue; // ya pasó la fecha del refuerzo
      const { error } = await supabase
        .from("estudio_revisiones")
        .upsert(
          { materia_id: e.materia_id, exam_date_id: e.id, tipo: item.tipo, fecha_programada: fecha },
          { onConflict: "exam_date_id,tipo", ignoreDuplicates: true }
        );
      if (!error) creadas++;
    }
  }

  return { creadas };
}

// Cola del día: revisiones pendientes que corresponden a hoy o arrastradas (viejas sin hacer).
export async function obtenerColaHoy(): Promise<{
  revisiones: Array<Revision & { materia_slug?: string; materia_nombre?: string; clase_numero?: number | null; clase_titulo?: string | null; exam_titulo?: string | null; exam_fecha?: string | null }>;
}> {
  const supabase = getSupabaseAdmin();
  const hoy = hoyLocal();

  const { data } = await supabase
    .from("estudio_revisiones")
    .select("*")
    .eq("hecha", false)
    .lte("fecha_programada", hoy)
    .order("fecha_programada", { ascending: true });

  const revis = (data || []) as Revision[];
  if (revis.length === 0) return { revisiones: [] };

  // Enriquecer con materia y clase
  const materiaIds = [...new Set(revis.map((r) => r.materia_id).filter(Boolean) as string[])];
  const claseIds = [...new Set(revis.map((r) => r.clase_id).filter(Boolean) as string[])];

  const [materiasRes, clasesRes] = await Promise.all([
    materiaIds.length
      ? supabase.from("materias").select("id, nombre, slug").in("id", materiaIds)
      : Promise.resolve({ data: [] as Array<{ id: string; nombre: string; slug: string }> }),
    claseIds.length
      ? supabase.from("clases").select("id, numero, titulo").in("id", claseIds)
      : Promise.resolve({ data: [] as Array<{ id: string; numero: number; titulo: string }> }),
  ]);

  const materiasMap = new Map((materiasRes.data || []).map((m) => [m.id, m]));
  const clasesMap = new Map((clasesRes.data || []).map((c) => [c.id, c]));

  const revisiones = revis.map((r) => {
    const m = r.materia_id ? materiasMap.get(r.materia_id) : undefined;
    const c = r.clase_id ? clasesMap.get(r.clase_id) : undefined;
    return {
      ...r,
      materia_slug: m?.slug,
      materia_nombre: m?.nombre,
      clase_numero: c?.numero ?? null,
      clase_titulo: c?.titulo ?? null,
    };
  });

  return { revisiones };
}

export async function marcarHecha(id: string): Promise<{ ok: boolean }> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("estudio_revisiones")
    .update({ hecha: true, completada_at: new Date().toISOString() })
    .eq("id", id);
  return { ok: !error };
}
