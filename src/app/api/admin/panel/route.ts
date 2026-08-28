import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";
export const dynamic = "force-dynamic";


export async function GET(request: Request) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  const [fichasRes, materiasRes, archivosRes, clasesRes, fechasRes] = await Promise.all([
    supabase
      .from("fichas")
      .select("id, titulo, contenido, materia_id, clase_id, tags, created_at, updated_at")
      .order("updated_at", { ascending: false }),
    supabase.from("materias").select("id, nombre, slug, comision, catedra, anio, turno").order("nombre"),
    supabase
      .from("archivos")
      .select("id, tipo, nombre_display, storage_key, youtube_url, cloudinary_url, nota, play_count, clase_id, created_at")
      .in("tipo", ["cuestionario", "material_privado"])
      .order("created_at", { ascending: false }),
    supabase
      .from("clases")
      .select("id, materia_id, numero, titulo, tema, fecha")
      .order("numero"),
    supabase
      .from("materia_fechas")
      .select("id, materia_id, titulo, fecha")
      .order("fecha"),
  ]);

  if (fichasRes.error || materiasRes.error || archivosRes.error || clasesRes.error || fechasRes.error) {
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

  const fichasRaw = fichasRes.data || [];

  const fichas = await Promise.all(
    fichasRaw.map(async (f) => {
      let clase_numero: number | null = null;
      if (f.clase_id) {
        const { data: clase } = await supabase
          .from("clases")
          .select("numero")
          .eq("id", f.clase_id)
          .single();
        clase_numero = clase?.numero ?? null;
      }
      return {
        ...f,
        materia_nombre: f.materia_id ? materiasMap.get(f.materia_id)?.nombre ?? null : null,
        materia_slug: f.materia_id ? materiasMap.get(f.materia_id)?.slug ?? null : null,
        clase_numero,
      };
    })
  );

  const clases = (clasesRes.data || []).map((c) => ({
    ...c,
    materia_nombre: materiasMap.get(c.materia_id)?.nombre ?? null,
    materia_slug: materiasMap.get(c.materia_id)?.slug ?? null,
  }));

  const fechas = fechasRes.data || [];

  const clasesPorMateria = new Map<string, number>();
  for (const c of clasesRes.data || []) {
    clasesPorMateria.set(c.materia_id, (clasesPorMateria.get(c.materia_id) || 0) + 1);
  }

  const materias = (materiasRes.data || []).map((m) => ({
    ...m,
    total_clases: clasesPorMateria.get(m.id) || 0,
  }));

  return NextResponse.json({ fichas, archivos: archivosConClase, materias, clases, fechas });
}
