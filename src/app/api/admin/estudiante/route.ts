import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";
export const dynamic = "force-dynamic";


interface ActivityRow {
  tipo: string | null;
  pagina: string | null;
  materia_slug: string | null;
  archivo_id: string | null;
  clase_id: string | null;
  created_at: string | null;
}

interface ArchivoRow {
  id: string;
  nombre_display: string | null;
  tipo: string | null;
  clase_id: string | null;
}

interface ClaseRow {
  id: string;
  numero: number | null;
  titulo: string | null;
  materias?: { nombre: string | null } | null;
}

// Eventos que representan "acceder" a un elemento de contenido
const USAGE_TIPOS = new Set([
  "play_start",
  "youtube_open",
  "transcription_view",
  "enlace_open",
  "file_open",
]);

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const nombre = (url.searchParams.get("nombre") || "").trim();
  if (!nombre) {
    return NextResponse.json({ error: "Falta el parámetro nombre" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: activity } = await supabase
      .from("actividad")
      .select("tipo, pagina, materia_slug, archivo_id, clase_id, created_at")
      .eq("nombre", nombre)
      .order("created_at", { ascending: false })
      .limit(500);

    const rows = (activity || []) as ActivityRow[];

    const total = rows.length;
    const reproducciones = rows.filter((a) => a.tipo === "play_start" || a.tipo === "youtube_open").length;
    const completados = rows.filter((a) => a.tipo === "play_complete").length;
    const materiasUnicas = new Set(rows.map((a) => a.materia_slug).filter(Boolean)).size;

    const archivoIds = [...new Set(rows.map((a) => a.archivo_id).filter(Boolean) as string[])];
    const claseIds = [...new Set(rows.map((a) => a.clase_id).filter(Boolean) as string[])];

    const [{ data: archivoRows }, { data: claseRowsSupabase }] = await Promise.all([
      archivoIds.length > 0
        ? supabase.from("archivos").select("id, nombre_display, tipo, clase_id").in("id", archivoIds)
        : Promise.resolve({ data: [] }),
      claseIds.length > 0
        ? supabase.from("clases").select("id, numero, titulo, materias(nombre)").in("id", claseIds)
        : Promise.resolve({ data: [] }),
    ]);

    const archivoMap = new Map(((archivoRows || []) as unknown as ArchivoRow[]).map((a) => [a.id, a]));
    const claseMap = new Map(((claseRowsSupabase || []) as unknown as ClaseRow[]).map((c) => [c.id, c]));

    const materiasBySlug = new Map<string, string>();
    const { data: allMaterias } = await supabase.from("materias").select("slug, nombre");
    (allMaterias || []).forEach((m) => {
      materiasBySlug.set(m.slug, m.nombre);
    });

    // Estructura: materia -> archivo -> { fecha: veces }
    const materiasMap = new Map<
      string,
      {
        materia_nombre: string;
        visitas: number;
        archivos: Map<
          string,
          {
            archivo_id: string;
            nombre: string;
            tipo: string;
            clase_numero: number | null;
            clase_titulo: string | null;
            total: number;
            porDia: Map<string, number>;
          }
        >;
      }
    >();

    function getMateria(materia_slug: string | null, archivo: ArchivoRow | undefined, clase: ClaseRow | undefined) {
      const key = materia_slug || "sin-materia";
      const nombre =
        clase?.materias?.nombre ||
        materiasBySlug.get(materia_slug || "") ||
        "Sin materia";
      if (!materiasMap.has(key)) {
        materiasMap.set(key, { materia_nombre: nombre, visitas: 0, archivos: new Map() });
      }
      return materiasMap.get(key)!;
    }

    for (const a of rows) {
      const archivo = a.archivo_id ? archivoMap.get(a.archivo_id) : undefined;
      const clase = a.clase_id ? claseMap.get(a.clase_id) : undefined;

      if (!a.archivo_id && (a.tipo === "page_view" || a.tipo === "class_view")) {
        const mat = getMateria(a.materia_slug, undefined, undefined);
        mat.visitas += 1;
        continue;
      }

      if (a.archivo_id && archivo && USAGE_TIPOS.has(a.tipo || "")) {
        const mat = getMateria(a.materia_slug, archivo, clase);
        const fecha = a.created_at ? new Date(a.created_at).toLocaleDateString("es-AR") : "?";
        const archivoKey = archivo.id;
        let ele = mat.archivos.get(archivoKey);
        if (!ele) {
          ele = {
            archivo_id: archivo.id,
            nombre: archivo.nombre_display || "",
            tipo: archivo.tipo || "",
            clase_numero: clase?.numero || null,
            clase_titulo: clase?.titulo || null,
            total: 0,
            porDia: new Map(),
          };
          mat.archivos.set(archivoKey, ele);
        }
        ele.total += 1;
        ele.porDia.set(fecha, (ele.porDia.get(fecha) || 0) + 1);
      }
    }

    const materias = [...materiasMap.entries()]
      .map(([materia_slug, m]) => ({
        materia_slug,
        materia_nombre: m.materia_nombre,
        visitas: m.visitas,
        elementos: [...m.archivos.values()]
          .sort((x, y) => y.total - x.total)
          .map((e) => ({
            archivo_id: e.archivo_id,
            nombre: e.nombre,
            tipo: e.tipo,
            clase_numero: e.clase_numero,
            clase_titulo: e.clase_titulo,
            total: e.total,
            porDia: [...e.porDia.entries()]
              .sort((a, b) => b[0].localeCompare(a[0]))
              .map(([fecha, veces]) => ({ fecha, veces })),
          })),
      }))
      .sort((a, b) => {
        const aTotal = a.elementos.reduce((s, e) => s + e.total, 0);
        const bTotal = b.elementos.reduce((s, e) => s + e.total, 0);
        return bTotal - aTotal || b.visitas - a.visitas;
      });

    return NextResponse.json({
      nombre,
      total,
      reproducciones,
      completados,
      materiasUnicas,
      materias,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
