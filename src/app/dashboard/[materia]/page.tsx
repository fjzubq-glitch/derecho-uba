import { cookies } from "next/headers";
import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";
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

const REVALIDATE = 300;

const getMateriaConFechas = (slug: string) =>
  unstable_cache(
    async () =>
      getSupabaseAdmin()
        .from("materias")
        .select("id, nombre, estado, materia_fechas(id, titulo, fecha)")
        .eq("slug", slug)
        .single(),
    ["materia-con-fechas", slug],
    { revalidate: REVALIDATE }
  )();

const getClases = (slug: string, materiaId: string) =>
  unstable_cache(
    async () =>
      getSupabaseAdmin()
        .from("clases")
        .select("id, numero, titulo, tema, fecha, created_at")
        .eq("materia_id", materiaId)
        .order("numero"),
    ["clases", slug],
    { revalidate: REVALIDATE }
  )();

const getArchivos = (slug: string, claseIds: string[]) =>
  unstable_cache(
    async () =>
      getSupabaseAdmin()
        .from("archivos")
        .select("id, clase_id, tipo, nombre_display, storage_key, youtube_url, duration_seconds, orden, created_at")
        .in("clase_id", claseIds)
        .order("orden")
        .order("created_at"),
    ["archivos", slug],
    { revalidate: REVALIDATE }
  )();

export default async function MateriaPage({
  params,
  searchParams,
}: {
  params: Promise<{ materia: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { materia: slug } = await params;
  const sp = await searchParams;
  const clave = typeof sp.clave === "string" ? sp.clave.trim() : null;
  const nombre = typeof sp.nombre === "string" ? sp.nombre.trim() : null;
  const esAdmin = isAdminRequest((await cookies()).toString());

  const { data: materia } = await getMateriaConFechas(slug);

  if (!materia) {
    return <MateriaClient slug={slug} materia={null} clases={[]} />;
  }

  let tieneAcceso = false;
  if (!esAdmin && clave && nombre && materia.id) {
    const { data: acceso } = await getSupabaseAdmin()
      .from("accesos_especiales")
      .select("id")
      .eq("materia_id", materia.id)
      .eq("clave", clave.toUpperCase())
      .ilike("nombre", nombre)
      .maybeSingle();
    tieneAcceso = !!acceso;
  }

  const { data: clases } = await getClases(slug, materia.id);

  const claseIds = (clases || []).map((c) => c.id);
  const { data: archivos } = claseIds.length
    ? await getArchivos(slug, claseIds)
    : { data: [] as ArchivoRow[] };

  const TIPOS_PRIVADOS = ["cuestionario", "material_privado", "ficha"];
  const porClase = new Map<string, ArchivoRow[]>();
  for (const a of archivos || []) {
    if (!esAdmin && !tieneAcceso && TIPOS_PRIVADOS.includes(a.tipo)) continue;
    const list = porClase.get(a.clase_id) || [];
    list.push(a);
    porClase.set(a.clase_id, list);
  }

  const clasesWithFiles = (clases || []).map((c) => {
    const archivosDeClase = porClase.get(c.id) || [];
    return { ...c, archivos: archivosDeClase };
  });

  const fechas = (materia as unknown as { materia_fechas?: { id: string; titulo: string; fecha: string }[] }).materia_fechas || [];

  return (
    <MateriaClient
      slug={slug}
      materia={{
        id: materia.id,
        nombre: materia.nombre,
        estado: materia.estado,
        fechas,
      }}
      clases={clasesWithFiles}
      acceso={{ clave: tieneAcceso ? clave : null, nombre: tieneAcceso ? nombre : null }}
    />
  );
}
