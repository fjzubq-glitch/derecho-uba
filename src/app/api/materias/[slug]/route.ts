import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";

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

  const clasesWithFiles = await Promise.all(
    (clases || []).map(async (c) => {
      const { data: archivos } = await supabase
        .from("archivos")
        .select("*")
        .eq("clase_id", c.id)
        .order("orden")
        .order("created_at");
      const visibles = (archivos || []).filter((a) => esAdmin || a.tipo !== "cuestionario");
      return { ...c, archivos: visibles };
    })
  );

  return NextResponse.json({ materia: { ...materia, fechas: fechas || [] }, clases: clasesWithFiles });
}
