import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hashIp } from "@/lib/hashIp";

export const dynamic = "force-dynamic";
export const revalidate = 60;

const TIPOS_CONTENIDO = ["play_start", "play_complete", "transcription_view", "youtube_open"];

export async function GET(request: NextRequest) {
  try {
    const forwarded = request.headers.get("x-forwarded-for");
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

    if (!events || events.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // Último evento por archivo (evita repetir el mismo material 5 veces seguidas)
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

    const items = seleccionados.map((ev) => {
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

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Continuar error:", error);
    return NextResponse.json({ items: [] });
  }
}