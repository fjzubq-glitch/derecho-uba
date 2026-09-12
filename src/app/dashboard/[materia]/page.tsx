import { cookies } from "next/headers";
import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";
import { TIPOS_PRIVADOS } from "@/lib/privados";
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
    { revalidate: REVALIDATE, tags: ["materias", `materia-${slug}`] }
  )();

// Una sola query con join (antes eran 2 roundtrips secuenciales a Supabase:
// clases y luego archivos). El orden por clase se aplica en JS.
const getClasesConArchivos = (slug: string, materiaId: string) =>
  unstable_cache(
    async () =>
      getSupabaseAdmin()
        .from("clases")
        .select("id, numero, titulo, tema, fecha, created_at, archivos(id, clase_id, tipo, nombre_display, storage_key, youtube_url, duration_seconds, orden, created_at)")
        .eq("materia_id", materiaId)
        .order("numero"),
    ["clases-archivos", slug],
    { revalidate: REVALIDATE, tags: ["materias", `materia-${slug}`] }
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

  let esAdmin = false;
  try {
    esAdmin = isAdminRequest((await cookies()).toString());
  } catch {
    // cookies() can fail in some edge cases; treat as non-admin
  }

type MateriaRow = { id: string; nombre: string; estado: string; materia_fechas?: { id: string; titulo: string; fecha: string }[] };

  let materia: MateriaRow | null = null;
  try {
    const result = await getMateriaConFechas(slug);
    materia = (result as { data: MateriaRow | null }).data;
  } catch {
    return <MateriaClient slug={slug} materia={null} clases={[]} />;
  }

  if (!materia) {
    return <MateriaClient slug={slug} materia={null} clases={[]} />;
  }

  let tieneAcceso = false;
  if (!esAdmin && clave && nombre && materia.id) {
    try {
      const { data: acceso } = await getSupabaseAdmin()
        .from("accesos_especiales")
        .select("id")
        .eq("materia_id", materia.id)
        .eq("clave", clave.toUpperCase())
        .ilike("nombre", nombre)
        .maybeSingle();
      tieneAcceso = !!acceso;
    } catch {
      // Grant check failed; proceed without special access
    }
  }

  let clasesWithFiles: Array<{
    id: string; numero: number; titulo: string; tema: string | null; fecha: string; created_at: string;
    archivos: ArchivoRow[];
  }> = [];
  try {
    const { data: clases } = await getClasesConArchivos(slug, materia.id);

    clasesWithFiles = ((clases || []) as Array<{
      id: string; numero: number; titulo: string; tema: string | null; fecha: string | null; created_at: string;
      archivos: ArchivoRow[] | null;
    }>).map((c) => {
      const archivosDeClase = [...(c.archivos || [])]
        .filter((a) => esAdmin || tieneAcceso || !TIPOS_PRIVADOS.includes(a.tipo))
        .sort((a, b) => (a.orden ?? 9999) - (b.orden ?? 9999) || (a.created_at < b.created_at ? -1 : 1));
      return {
        id: c.id,
        numero: c.numero,
        titulo: c.titulo,
        tema: c.tema,
        fecha: c.fecha || "",
        created_at: c.created_at,
        archivos: archivosDeClase,
      };
    });
  } catch {
    // Classes query failed; render with empty list
  }

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
