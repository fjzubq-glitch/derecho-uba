import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";
export const dynamic = "force-dynamic";

const REVALIDATE = 300;

const getMateriaData = (slug: string) =>
  unstable_cache(
    async () => {
      const supabase = getSupabaseAdmin();

      const { data: materia } = await supabase
        .from("materias")
        .select("id, nombre, estado")
        .eq("slug", slug)
        .single();

      if (!materia) return null;

      const [{ data: clases }, { data: fechas }] = await Promise.all([
        supabase
          .from("clases")
          .select("id, numero, titulo, tema, fecha")
          .eq("materia_id", materia.id)
          .order("numero"),
        supabase
          .from("materia_fechas")
          .select("id, titulo, fecha")
          .eq("materia_id", materia.id)
          .order("fecha"),
      ]);

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

      const clasesWithFiles = (clases || []).map((c) => ({
        ...c,
        archivos: porClase.get(c.id) || [],
      }));

      return { materia: { ...materia, fechas: fechas || [] }, clases: clasesWithFiles };
    },
    ["materia-detalle", slug],
    { revalidate: REVALIDATE, tags: ["materias", `materia-${slug}`] }
  )();


export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const esAdmin = isAdminRequest(request.headers.get("cookie"));

  const data = await getMateriaData(slug);

  if (!data) {
    return NextResponse.json({ materia: null, clases: [] });
  }

  // Filtrar cuestionarios y privados para no-admins
  const clasesFiltradas = data.clases.map((c) => ({
    ...c,
    archivos: c.archivos.filter((a) => esAdmin || (a.tipo !== "cuestionario" && a.tipo !== "material_privado" && a.tipo !== "ficha")),
  }));

  return NextResponse.json({ materia: data.materia, clases: clasesFiltradas });
}
