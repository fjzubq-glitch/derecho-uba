import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";

const ALLOWED = ["nombre", "comision", "catedra", "anio", "turno", "descripcion"];

function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return unauthorized();
  }

  const { slug, nombre } = await request.json();

  if (!slug || !nombre) {
    return NextResponse.json({ error: "slug and nombre required" }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from("materias")
    .update({ nombre })
    .eq("slug", slug);

  if (error) throw error;

  return NextResponse.json({ ok: true });
}

export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return unauthorized();
  }

  try {
    const { id, slug, data } = await request.json();

    const updateData: Record<string, string> = {};

    // Edición por estado (legacy de mob se gestiona por slug)
    if (data?.estado) {
      if (!["en_curso", "finalizada"].includes(data.estado)) {
        return NextResponse.json({ error: "estado must be 'en_curso' or 'finalizada'" }, { status: 400 });
      }
      updateData.estado = data.estado;
    }

    // Edición de campos libres (por id), según esta rama
    if (data) {
      for (const key of ALLOWED) {
        if (data[key] !== undefined) updateData[key] = data[key];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "nada que actualizar" }, { status: 400 });
    }

    let query = getSupabaseAdmin().from("materias").update(updateData);
    if (id) query = query.eq("id", id);
    else if (slug) query = query.eq("slug", slug);
    else return NextResponse.json({ error: "id or slug required" }, { status: 400 });

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Materia edit error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}