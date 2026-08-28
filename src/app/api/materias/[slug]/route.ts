import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";
export const dynamic = "force-dynamic";


export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  // Los cuestionarios solo se envían al administrador
  const esAdmin = isAdminRequest(request.headers.get("cookie"));
  const supabase = getSupabaseAdmin();

  const { data: materia } = await supabase
    .from("materias")
    .select("id, nombre, estado")
    .eq("slug", slug)
    .single();

  if (!materia) {
    return NextResponse.json({ materia: null, clases: [] });
  }

  const { data: clases } = await supabase
    .from("clases")
    .select("id, numero, titulo, tema, fecha")
    .eq("materia_id", materia.id)
    .order("numero");

  const { data: fechas } = await supabase
    .from("materia_fechas")
    .select("id, titulo, fecha")
    .eq("materia_id", materia.id)
    .order("fecha");

  const claseIds = (clases || []).map((c) => c.id);
  const { data: archivos } = claseIds.length
    ? await supabase
        .from("archivos")
        .select("id, clase_id, tipo, nombre_display, storage_key, youtube_url, duration_seconds, orden, created_at")
        .in("clase_id", claseIds)
        .order("orden")
        .order("created_at")
    : { data: [] };

  const porClase = new Map<string, typeof archivos>();
  for (const a of archivos || []) {
    const list = porClase.get(a.clase_id) || [];
    list.push(a);
    porClase.set(a.clase_id, list);
  }

  const clasesWithFiles = (clases || []).map((c) => {
    const archivosDeClase = porClase.get(c.id) || [];
    const visibles = archivosDeClase.filter((a) => esAdmin || (a.tipo !== "cuestionario" && a.tipo !== "material_privado" && a.tipo !== "ficha"));
    return { ...c, archivos: visibles };
  });

  return NextResponse.json({ materia: { ...materia, fechas: fechas || [] }, clases: clasesWithFiles });
}
