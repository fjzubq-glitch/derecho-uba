import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";
export const dynamic = "force-dynamic";

const TIPOS_PRIVADOS = ["cuestionario", "material_privado", "ficha"];

// GET: lista todos los grants con contexto (materia/clase/archivo).
// Solo archivos privados.
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    const supabase = getSupabaseAdmin();
    const { data: grants } = await supabase
      .from("accesos_archivo")
      .select("id, archivo_id, nombre, created_at")
      .order("created_at", { ascending: false });

    const archivoIds = [...new Set((grants || []).map((g) => g.archivo_id))];
    let archivosMap = new Map<string, { id: string; nombre_display: string; tipo: string; clase_id: string }>();
    let clasesMap = new Map<string, { id: string; numero: number; titulo: string; materia_id: string }>();
    let materiasMap = new Map<string, { id: string; nombre: string; slug: string }>();
    if (archivoIds.length > 0) {
      const { data: archivos } = await supabase
        .from("archivos")
        .select("id, nombre_display, tipo, clase_id")
        .in("id", archivoIds);
      archivosMap = new Map((archivos || []).map((a) => [a.id, a]));
      const claseIds = [...new Set((archivos || []).map((a) => a.clase_id).filter(Boolean) as string[])];
      if (claseIds.length > 0) {
        const { data: clases } = await supabase
          .from("clases")
          .select("id, numero, titulo, materia_id")
          .in("id", claseIds);
        clasesMap = new Map((clases || []).map((c) => [c.id, c]));
        const materiaIds = [...new Set((clases || []).map((c) => c.materia_id).filter(Boolean) as string[])];
        if (materiaIds.length > 0) {
          const { data: materias } = await supabase
            .from("materias")
            .select("id, nombre, slug")
            .in("id", materiaIds);
          materiasMap = new Map((materias || []).map((m) => [m.id, m]));
        }
      }
    }

    // Opcional: ?materia_slug= para listar archivos privados elegibles
    let privados: Array<{ archivo_id: string; archivo_nombre: string; archivo_tipo: string; clase_numero: number | null; clase_titulo: string; conGrant: number }> = [];
    const materiaSlug = new URL(request.url).searchParams.get("materia_slug")?.trim();
    if (materiaSlug) {
      const { data: mat } = await supabase.from("materias").select("id").eq("slug", materiaSlug).single();
      if (mat) {
        const { data: clases } = await supabase.from("clases").select("id, numero, titulo").eq("materia_id", mat.id).order("numero");
        const claseIds = (clases || []).map((c) => c.id);
        if (claseIds.length > 0) {
          const { data: archs } = await supabase
            .from("archivos")
            .select("id, nombre_display, tipo, clase_id")
            .in("clase_id", claseIds)
            .in("tipo", TIPOS_PRIVADOS)
            .order("created_at", { ascending: false });
          const claseMap = new Map((clases || []).map((c) => [c.id, c]));
          const grantCount = new Map<string, number>();
          for (const g of grants || []) grantCount.set(g.archivo_id, (grantCount.get(g.archivo_id) || 0) + 1);
          privados = (archs || [])
            .map((a) => {
              const c = claseMap.get(a.clase_id);
              return {
                archivo_id: a.id,
                archivo_nombre: a.nombre_display,
                archivo_tipo: a.tipo,
                clase_numero: c?.numero ?? null,
                clase_titulo: c?.titulo || "",
                conGrant: grantCount.get(a.id) || 0,
              };
            })
            .sort((x, y) => (x.clase_numero ?? 9999) - (y.clase_numero ?? 9999) || x.archivo_nombre.localeCompare(y.archivo_nombre));
        }
      }
    }

    const lista = (grants || []).map((g) => {
      const a = archivosMap.get(g.archivo_id);
      const c = a?.clase_id ? clasesMap.get(a.clase_id) : undefined;
      const m = c?.materia_id ? materiasMap.get(c.materia_id) : undefined;
      return {
        id: g.id,
        archivo_id: g.archivo_id,
        nombre: g.nombre,
        created_at: g.created_at,
        archivo_nombre: a?.nombre_display || "",
        archivo_tipo: a?.tipo || "",
        clase_numero: c?.numero ?? null,
        clase_titulo: c?.titulo || "",
        materia_nombre: m?.nombre || "",
        materia_slug: m?.slug || "",
      };
    });

    return NextResponse.json({ ok: true, grants: lista, privados });
  } catch (e) {
    console.error("accesos-archivo GET:", e);
    return NextResponse.json({ ok: false, error: "Error al leer" }, { status: 500 });
  }
}

// POST { archivo_id, nombre } — otorga acceso a UN archivo privado.
export async function POST(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    const { archivo_id, nombre } = await request.json();
    const nom = String(nombre || "").trim();
    if (!archivo_id || !nom) {
      return NextResponse.json({ ok: false, error: "Faltan datos" }, { status: 400 });
    }
    const supabase = getSupabaseAdmin();
    const { data: archivo } = await supabase
      .from("archivos")
      .select("id, tipo")
      .eq("id", archivo_id)
      .single();
    if (!archivo) {
      return NextResponse.json({ ok: false, error: "Archivo no encontrado" }, { status: 404 });
    }
    if (!TIPOS_PRIVADOS.includes(archivo.tipo)) {
      return NextResponse.json({ ok: false, error: "Solo archivos privados (cuestionario, material privado, ficha)" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("accesos_archivo")
      .insert({ archivo_id, nombre: nom })
      .select("id")
      .single();
    if (error) {
      if (String(error.code) === "23505" || /duplicate/i.test(error.message)) {
        return NextResponse.json({ ok: false, error: "Ya tiene acceso a este archivo" }, { status: 409 });
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: data.id });
  } catch (e) {
    console.error("accesos-archivo POST:", e);
    return NextResponse.json({ ok: false, error: "Error al otorgar" }, { status: 500 });
  }
}

// DELETE ?id= — revoca un grant.
export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "Falta id" }, { status: 400 });
    const { error } = await getSupabaseAdmin().from("accesos_archivo").delete().eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("accesos-archivo DELETE:", e);
    return NextResponse.json({ ok: false, error: "Error al revocar" }, { status: 500 });
  }
}
