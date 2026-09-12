import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase";
import CalendarioClient from "./CalendarioClient";

export const dynamic = "force-dynamic";

const REVALIDATE = 300;

const getMateriaConFechas = (slug: string) =>
  unstable_cache(
    async () =>
      getSupabaseAdmin()
        .from("materias")
        .select("id, nombre, estado, materia_fechas(id, titulo, fecha)")
        .eq("slug", slug)
        .single(),
    ["materia-con-fechas-calendario", slug],
    { revalidate: REVALIDATE, tags: ["materias", `materia-${slug}`] }
  )();

type MateriaData = { id: string; nombre: string; estado?: string; materia_fechas?: Array<{ id: string; titulo: string; fecha: string }> };

const empty: MateriaData | null = null;

export default async function CalendarioPage({
  params,
}: {
  params: Promise<{ materia: string }>;
}) {
  const { materia: slug } = await params;

  let materia: MateriaData | null = empty;
  try {
    const result = await getMateriaConFechas(slug);
    materia = (result as { data: MateriaData | null }).data;
  } catch {
    // Supabase query failed; render with null materia
  }

  const fechas = materia?.materia_fechas || [];

  const materiaData = materia
    ? {
        id: materia.id,
        nombre: materia.nombre,
        estado: materia.estado,
        fechas,
      }
    : null;

  return <CalendarioClient initialMateria={materiaData} slug={slug} />;
}
