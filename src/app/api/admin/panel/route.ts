import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";

export async function GET(request: Request) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  const [fichasRes, materiasRes, archivosRes] = await Promise.all([
    supabase
      .from("fichas")
      .select("id, titulo, contenido, materia_id, tags, created_at, updated_at")
      .order("updated_at", { ascending: false }),
    supabase.from("materias").select("id, nombre, slug").order("nombre"),
    supabase
      .from("archivos")
      .select("id, tipo, nombre_display, storage_key, youtube_url, cloudinary_url, nota, play_count, clase_id, created_at")
      .in("tipo", ["cuestionario", "material_privado"])
      .order("created_at", { ascending: false }),
  ]);

  if (fichasRes.error || materiasRes.error || archivosRes.error) {
    return NextResponse.json({ error: "Error al cargar datos" }, { status: 500 });
  }

  const materiasMap = new Map((materiasRes.data || []).map((m) => [m.id, m]));

  const archivosConClase = await Promise.all(
    (archivosRes.data || []).map(async (a) => {
      if (!a.clase_id) return { ...a, materia_id: null, materia_nombre: null, clase_numero: null, clase_titulo: null };
      const { data: clase } = await supabase
        .from("clases")
        .select("id, materia_id, numero, titulo")
        .eq("id", a.clase_id)
        .single();
      const materia = clase ? materiasMap.get(clase.materia_id) : null;
      return {
        ...a,
        materia_id: clase?.materia_id ?? null,
        materia_nombre: materia?.nombre ?? null,
        materia_slug: materia?.slug ?? null,
        clase_numero: clase?.numero ?? null,
        clase_titulo: clase?.titulo ?? null,
      };
    })
  );

  const fichas = (fichasRes.data || []).map((f) => ({
    ...f,
    materia_nombre: f.materia_id ? materiasMap.get(f.materia_id)?.nombre ?? null : null,
    materia_slug: f.materia_id ? materiasMap.get(f.materia_id)?.slug ?? null : null,
  }));

  return NextResponse.json({ fichas, archivos: archivosConClase, materias: materiasRes.data || [] });
}
