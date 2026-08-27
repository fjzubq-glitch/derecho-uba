import { getSupabaseAdmin } from "@/lib/supabase";
import MateriaClient from "./MateriaClient";

export const dynamic = "force-dynamic";

interface ArchivoRow {
  id: string;
  clase_id: string;
  tipo: string;
  nombre_display: string;
  storage_key: string | null;
  youtube_url: string | null;
  duration_seconds: number | null;
  orden: number | null;
  created_at: string;
}

export default async function MateriaPage({
  params,
}: {
  params: Promise<{ materia: string }>;
}) {
  const { materia: slug } = await params;
  const supabase = getSupabaseAdmin();

  const { data: materia } = await supabase
    .from("materias")
    .select("id, nombre, estado")
    .eq("slug", slug)
    .single();

  if (!materia) {
    return <MateriaClient slug={slug} materia={null} clases={[]} />;
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

  const porClase = new Map<string, ArchivoRow[]>();
  for (const a of archivos || []) {
    const list = porClase.get(a.clase_id) || [];
    list.push(a);
    porClase.set(a.clase_id, list);
  }

  const clasesWithFiles = (clases || []).map((c) => {
    const archivosDeClase = porClase.get(c.id) || [];
    return { ...c, archivos: archivosDeClase };
  });

  return (
    <MateriaClient
      slug={slug}
      materia={{ ...materia, fechas: fechas || [] }}
      clases={clasesWithFiles}
    />
  );
}
