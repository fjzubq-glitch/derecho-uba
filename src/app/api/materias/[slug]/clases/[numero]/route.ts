import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; numero: string }> }
) {
  const { slug, numero } = await params;
  const esAdmin = isAdminRequest(request.headers.get("cookie"));
  const supabase = getSupabaseAdmin();
  const num = parseInt(numero);

  const { data: materia } = await supabase
    .from("materias")
    .select("id, nombre, estado")
    .eq("slug", slug)
    .single();

  if (!materia) {
    return NextResponse.json({ materia: null, clase: null, adjacentes: [] });
  }

  const { data: clase } = await supabase
    .from("clases")
    .select("id, numero, titulo, tema, fecha")
    .eq("materia_id", materia.id)
    .eq("numero", num)
    .single();

  if (!clase) {
    return NextResponse.json({ materia, clase: null, adjacentes: [] });
  }

  const { data: archivos } = await supabase
    .from("archivos")
    .select("id, tipo, nombre_display, storage_key, youtube_url, cloudinary_url, contenido_texto, nota, duration_seconds, play_count, orden")
    .eq("clase_id", clase.id)
    .order("orden")
    .order("created_at");

  const visibles = (archivos || []).filter((a) => esAdmin || (a.tipo !== "cuestionario" && a.tipo !== "material_privado"));

  const { data: vecinos } = await supabase
    .from("clases")
    .select("numero, titulo")
    .eq("materia_id", materia.id)
    .in("numero", [num - 1, num + 1]);

  const adjacentes = (vecinos || [])
    .slice()
    .sort((a, b) => a.numero - b.numero);

  return NextResponse.json({ materia, clase: { ...clase, archivos: visibles }, adjacentes });
}
