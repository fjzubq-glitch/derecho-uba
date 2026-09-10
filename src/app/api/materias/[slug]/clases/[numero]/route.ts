import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";
import { TIPOS_PRIVADOS, tieneGrant } from "@/lib/privados";
export const dynamic = "force-dynamic";

async function getClaseData(slug: string, num: number) {
  const supabase = getSupabaseAdmin();

  // Materia + clase en 1 sola query con join (antes eran 2 secuenciales).
  const { data: claseRows } = await supabase
    .from("clases")
    .select("id, numero, titulo, tema, fecha, materias!inner(id, nombre, estado)")
    .eq("numero", num)
    .eq("materias.slug", slug)
    .limit(1);

  const row = (claseRows || [])[0] as unknown as {
    id: string; numero: number; titulo: string; tema: string | null; fecha: string | null;
    materias: { id: string; nombre: string; estado: string };
  } | undefined;

  if (!row) {
    return { materia: null, clase: null, adjacentes: [] as unknown[] };
  }

  const materia = row.materias;
  const clase = { id: row.id, numero: row.numero, titulo: row.titulo, tema: row.tema, fecha: row.fecha };

  const [archivosRes, vecinosRes] = await Promise.all([
    supabase
      .from("archivos")
      .select("id, tipo, nombre_display, storage_key, youtube_url, cloudinary_url, contenido_texto, nota, duration_seconds, play_count, orden")
      .eq("clase_id", clase.id)
      .order("orden")
      .order("created_at"),
    supabase
      .from("clases")
      .select("numero, titulo")
      .eq("materia_id", materia.id)
      .in("numero", [num - 1, num + 1]),
  ]);

  const adjacentes = (vecinosRes.data || [])
    .slice()
    .sort((a, b) => a.numero - b.numero);

  return { materia, clase: { ...clase, archivos: archivosRes.data || [] }, adjacentes };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; numero: string }> }
) {
  const { slug, numero } = await params;
  const url = new URL(request.url);
  const clave = url.searchParams.get("clave")?.trim() || null;
  const nombre = url.searchParams.get("nombre")?.trim() || null;
  const esAdmin = isAdminRequest(request.headers.get("cookie"));
  const num = parseInt(numero);

  const data = await unstable_cache(
    () => getClaseData(slug, num),
    ["clase-detalle", slug, String(num)],
    { revalidate: 300, tags: ["clase-detalle", `clase-${slug}-${num}`] },
  )();

  if (!data.materia || !data.clase) {
    return NextResponse.json({ materia: data.materia, clase: null, adjacentes: [] });
  }

  // Si es admin, o el visitante presenta clave+nombre válida para la materia,
  // se incluyen los archivos privados.
  let tieneAcceso = false;
  if (!esAdmin && clave && nombre && data.materia.id) {
    const { data: acceso } = await getSupabaseAdmin()
      .from("accesos_especiales")
      .select("id")
      .eq("materia_id", data.materia.id)
      .eq("clave", clave.toUpperCase())
      .ilike("nombre", nombre)
      .maybeSingle();
    tieneAcceso = !!acceso;
  }

  // El filtrado de tipos privados es por-request (depende de esAdmin / acceso)
  // y no se cachea, así el cache compartido no filtra para el rol equivocado.
  // Además: grants por archivo (premios) — un alumno con grant ve ESE archivo
  // aunque no tenga la clave de la materia. Se identifica solo por nombre
  // (comparación normalizada: ignora mayúsculas, tildes y espacios de más).
  let grantedIds: string[] = [];
  if (!esAdmin && !tieneAcceso && nombre) {
    const privados = (data.clase.archivos || []).filter((a) => TIPOS_PRIVADOS.includes(a.tipo));
    if (privados.length > 0) {
      const { data: grants } = await getSupabaseAdmin()
        .from("accesos_archivo")
        .select("archivo_id, nombre")
        .in("archivo_id", privados.map((a) => a.id));
      const porArchivo = new Map<string, Array<{ nombre?: string | null }>>();
      for (const g of grants || []) {
        const list = porArchivo.get(g.archivo_id) || [];
        list.push({ nombre: g.nombre });
        porArchivo.set(g.archivo_id, list);
      }
      grantedIds = privados.filter((a) => tieneGrant(porArchivo.get(a.id) || [], nombre)).map((a) => a.id);
    }
  }
  const grantSet = new Set(grantedIds);
  const visibles = (data.clase.archivos || []).filter(
    (a) => esAdmin || tieneAcceso || grantSet.has(a.id) || !TIPOS_PRIVADOS.includes(a.tipo),
  );

  return NextResponse.json({
    materia: data.materia,
    clase: { ...data.clase, archivos: visibles },
    adjacentes: data.adjacentes,
    grants: grantedIds,
  });
}
