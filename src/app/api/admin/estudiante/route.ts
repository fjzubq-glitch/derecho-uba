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
}

interface ArchivoRow {
  id: string;
  nombre_display: string | null;
}

interface ClaseRow {
  id: string;
  numero: number | null;
  titulo: string | null;
  materias?: { nombre: string | null } | null;
}

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
      .select("tipo, pagina, materia_slug, archivo_id, clase_id, created_at, ip_hash")
      .eq("nombre", nombre)
      .order("created_at", { ascending: false })
      .limit(100);

    const rows = (activity || []) as (ActivityRow & { ip_hash: string | null })[];

    const archivoIds = [...new Set(rows.map((a) => a.archivo_id).filter(Boolean) as string[])];
    const claseIds = [...new Set(rows.map((a) => a.clase_id).filter(Boolean) as string[])];

    const [{ data: archivoRows }, { data: claseRowsSupabase }] = await Promise.all([
      archivoIds.length > 0
        ? supabase.from("archivos").select("id, nombre_display").in("id", archivoIds)
        : Promise.resolve({ data: [] }),
      claseIds.length > 0
        ? supabase.from("clases").select("id, numero, titulo, materias(nombre)").in("id", claseIds)
        : Promise.resolve({ data: [] }),
    ]);

    const archivoMap = new Map(((archivoRows || []) as unknown as ArchivoRow[]).map((a) => [a.id, a]));
    const claseMap = new Map(((claseRowsSupabase || []) as unknown as ClaseRow[]).map((c) => [c.id, c]));

    const eventos = rows.map((a) => {
      const archivo = a.archivo_id ? archivoMap.get(a.archivo_id) : undefined;
      const clase = a.clase_id ? claseMap.get(a.clase_id) : undefined;
      return {
        tipo: a.tipo,
        pagina: a.pagina,
        materia_slug: a.materia_slug,
        archivo_nombre: archivo?.nombre_display || null,
        materia: clase?.materias?.nombre || null,
        clase_numero: clase?.numero || null,
        clase_titulo: clase?.titulo || null,
        created_at: a.created_at,
        ip_hash: a.ip_hash,
      };
    });

    const total = rows.length;
    const reproducciones = rows.filter((a) => a.tipo === "play_start" || a.tipo === "youtube_open").length;
    const completados = rows.filter((a) => a.tipo === "play_complete").length;
    const materiasUnicas = new Set(rows.map((a) => a.materia_slug).filter(Boolean)).size;

    return NextResponse.json({
      nombre,
      total,
      reproducciones,
      completados,
      materiasUnicas,
      eventos,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
