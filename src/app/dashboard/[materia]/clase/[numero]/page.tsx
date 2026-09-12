import { cookies } from "next/headers";
import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";
import { TIPOS_PRIVADOS, tieneGrant } from "@/lib/privados";
import ClaseClient from "./ClaseClient";

export const dynamic = "force-dynamic";

async function getClaseData(slug: string, num: number) {
  const supabase = getSupabaseAdmin();

  const { data: claseRows } = await supabase
    .from("clases")
    .select("id, numero, titulo, tema, fecha, materias!inner(id, nombre, estado)")
    .eq("numero", num)
    .eq("materias.slug", slug)
    .limit(1);

  const row = (claseRows || [])[0] as unknown as {
    id: string; numero: number; titulo: string; tema: string | null; fecha: string | null;
    materias: { id: string; nombre: string; estado: string };
  } | undefined;

  if (!row) {
    return { materia: null, clase: null, adjacentes: [] as unknown[] };
  }

  const materia = row.materias;
  const clase = { id: row.id, numero: row.numero, titulo: row.titulo, tema: row.tema, fecha: row.fecha };

  const [archivosRes, vecinosRes] = await Promise.all([
    supabase
      .from("archivos")
      .select("id, tipo, nombre_display, storage_key, youtube_url, cloudinary_url, contenido_texto, nota, duration_seconds, play_count, orden")
      .eq("clase_id", clase.id)
      .order("orden")
      .order("created_at"),
    supabase
      .from("clases")
      .select("numero, titulo")
      .eq("materia_id", materia.id)
      .in("numero", [num - 1, num + 1]),
  ]);

  const adjacentes = (vecinosRes.data || [])
    .slice()
    .sort((a, b) => a.numero - b.numero);

  return { materia, clase: { ...clase, archivos: archivosRes.data || [] }, adjacentes };
}

export default async function ClaseNumeroPage({
  params,
  searchParams,
}: {
  params: Promise<{ materia: string; numero: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { materia: slug, numero } = await params;
  const sp = await searchParams;
  const clave = typeof sp.clave === "string" ? sp.clave.trim() : null;
  const nombre = typeof sp.nombre === "string" ? sp.nombre.trim() : null;
  const esAdmin = isAdminRequest((await cookies()).toString());
  const num = parseInt(numero);

  const data = await unstable_cache(
    () => getClaseData(slug, num),
    ["clase-detalle", slug, String(num)],
    { revalidate: 300, tags: ["clase-detalle", `clase-${slug}-${num}`] },
  )();

  if (!data.materia || !data.clase) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--color-ink)" }}>
        <p style={{ color: "var(--color-text-faint)", fontSize: "14px" }}>Clase no encontrada</p>
      </div>
    );
  }

  let tieneAcceso = false;
  if (!esAdmin && clave && nombre && data.materia.id) {
    const { data: acceso } = await getSupabaseAdmin()
      .from("accesos_especiales")
      .select("id")
      .eq("materia_id", data.materia.id)
      .eq("clave", clave.toUpperCase())
      .ilike("nombre", nombre)
      .maybeSingle();
    tieneAcceso = !!acceso;
  }

  let grantedIds: string[] = [];
  if (!esAdmin && !tieneAcceso && nombre) {
    const privados = (data.clase.archivos || []).filter((a) => TIPOS_PRIVADOS.includes(a.tipo));
    if (privados.length > 0) {
      const { data: grants } = await getSupabaseAdmin()
        .from("accesos_archivo")
        .select("archivo_id, nombre")
        .in("archivo_id", privados.map((a) => a.id));
      const porArchivo = new Map<string, Array<{ nombre?: string | null }>>();
      for (const g of grants || []) {
        const list = porArchivo.get(g.archivo_id) || [];
        list.push({ nombre: g.nombre });
        porArchivo.set(g.archivo_id, list);
      }
      grantedIds = privados.filter((a) => tieneGrant(porArchivo.get(a.id) || [], nombre)).map((a) => a.id);
    }
  }
  const grantSet = new Set(grantedIds);
  const visibles = (data.clase.archivos || []).filter(
    (a) => esAdmin || tieneAcceso || grantSet.has(a.id) || !TIPOS_PRIVADOS.includes(a.tipo),
  );

  return (
    <ClaseClient
      initialData={{
        materia: { id: data.materia.id, nombre: data.materia.nombre },
        clase: { ...data.clase, archivos: visibles },
        adjacentes: data.adjacentes as { numero: number; titulo: string }[],
        grants: grantedIds,
      }}
    />
  );
}
