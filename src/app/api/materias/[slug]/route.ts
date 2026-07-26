import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = getSupabaseAdmin();

  const { data: materia } = await supabase
    .from("materias")
    .select("id, nombre")
    .eq("slug", slug)
    .single();

  if (!materia) {
    return NextResponse.json({ materia: null, clases: [] });
  }

  const { data: clases } = await supabase
    .from("clases")
    .select("id, numero, titulo, fecha")
    .eq("materia_id", materia.id)
    .order("numero");

  const clasesWithFiles = await Promise.all(
    (clases || []).map(async (c) => {
      const { data: archivos } = await supabase
        .from("archivos")
        .select("*")
        .eq("clase_id", c.id)
        .order("created_at");
      return { ...c, archivos: archivos || [] };
    })
  );

  return NextResponse.json({ materia, clases: clasesWithFiles });
}
