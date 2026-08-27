import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hashIp } from "@/lib/hashIp";
import HomeClient from "./HomeClient";

export const revalidate = 300;

interface MateriaRow {
  id: string;
  nombre: string;
  slug: string;
  comision: string | null;
  catedra: string | null;
  anio: string | null;
  turno: string | null;
  clases: { id: string }[] | null;
  materia_fechas: { id: string; titulo: string; fecha: string }[] | null;
}

interface MateriaWithRel extends MateriaRow {
  clases: { id: string }[] | null;
  materia_fechas: { id: string; titulo: string; fecha: string }[] | null;
}

const TIPOS_CONTENIDO = ["play_start", "play_complete", "transcription_view", "youtube_open"];

async function loadMaterias() {
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

    return materias.map((m) => ({
      id: m.id,
      nombre: m.nombre,
      slug: m.slug,
      comision: m.comision,
      catedra: m.catedra,
      anio: m.anio,
      turno: m.turno,
      total_clases: m.clases?.length || 0,
      clase_ids: (m.clases || []).map((c) => c.id),
    }));
  } catch {
    return [];
  }
}

async function loadContinuar() {
  try {
    const hdrs = await headers();
    const forwarded = hdrs.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0] || "unknown";
    const ipHash = await hashIp(ip);

    const supabase = getSupabaseAdmin();

    const { data: events } = await supabase
      .from("actividad")
      .select("tipo, archivo_id, clase_id, materia_slug, created_at")
      .eq("ip_hash", ipHash)
      .in("tipo", TIPOS_CONTENIDO)
      .not("archivo_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!events || events.length === 0) return [];

    const ultimos: Record<string, (typeof events)[number]> = {};
    for (const ev of events) {
      if (!ev.archivo_id || ev.archivo_id in ultimos) continue;
      ultimos[ev.archivo_id] = ev;
      if (Object.keys(ultimos).length >= 4) break;
    }
    const seleccionados = Object.values(ultimos);

    const archivoIds = seleccionados.map((e) => e.archivo_id as string).filter(Boolean);
    const claseIds = seleccionados.map((e) => e.clase_id as string).filter(Boolean);

    const [{ data: archivos }, { data: clases }] = await Promise.all([
      supabase.from("archivos").select("id, nombre_display, tipo, orden").in("id", archivoIds),
      supabase.from("clases").select("id, numero, titulo, materia_id").in("id", claseIds),
    ]);

    const materiasIds = Array.from(new Set((clases || []).map((c) => c.materia_id).filter(Boolean)));
    const { data: materias } =
      materiasIds.length > 0
        ? await supabase.from("materias").select("id, slug, nombre").in("id", materiasIds)
        : { data: [] };

    const archivoMap = new Map((archivos || []).map((a) => [a.id, a]));
    const claseMap = new Map((clases || []).map((c) => [c.id, c]));
    const materiaMap = new Map((materias || []).map((m) => [m.id, m]));

    return seleccionados.map((ev) => {
      const archivo = ev.archivo_id ? archivoMap.get(ev.archivo_id) : null;
      const clase = ev.clase_id ? claseMap.get(ev.clase_id) : null;
      const materia = clase?.materia_id ? materiaMap.get(clase.materia_id) : null;
      return {
        tipo: ev.tipo,
        archivo_id: ev.archivo_id,
        nombre_display: archivo?.nombre_display || "",
        clase_id: ev.clase_id,
        clase_numero: clase?.numero ?? null,
        clase_titulo: clase?.titulo || "",
        materia_slug: ev.materia_slug || materia?.slug || "",
        materia_nombre: materia?.nombre || "",
        created_at: ev.created_at,
      };
    });
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [materias, continuarItems] = await Promise.all([loadMaterias(), loadContinuar()]);

  return <HomeClient materias={materias} continuarItems={continuarItems} />;
}
