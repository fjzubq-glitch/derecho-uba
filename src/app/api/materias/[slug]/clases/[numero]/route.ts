import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";
export const dynamic = "force-dynamic";

async function getClaseData(slug: string, num: number) {
  const supabase = getSupabaseAdmin();

  const { data: materia } = await supabase
    .from("materias")
    .select("id, nombre, estado")
    .eq("slug", slug)
    .single();

  if (!materia) {
    return { materia: null, clase: null, adjacentes: [] as unknown[] };
  }

  const { data: clase } = await supabase
    .from("clases")
    .select("id, numero, titulo, tema, fecha")
    .eq("materia_id", materia.id)
    .eq("numero", num)
    .single();

  if (!clase) {
    return { materia, clase: null, adjacentes: [] as unknown[] };
  }

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
    { revalidate: 300 },
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
  const visibles = (data.clase.archivos || []).filter(
    (a) => esAdmin || tieneAcceso || (a.tipo !== "cuestionario" && a.tipo !== "material_privado" && a.tipo !== "ficha"),
  );

  return NextResponse.json({
    materia: data.materia,
    clase: { ...data.clase, archivos: visibles },
    adjacentes: data.adjacentes,
  });
}
