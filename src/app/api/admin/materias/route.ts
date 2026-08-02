import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
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
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { slug, estado } = await request.json();

  if (!slug || !estado) {
    return NextResponse.json({ error: "slug and estado required" }, { status: 400 });
  }

  if (!["en_curso", "finalizada"].includes(estado)) {
    return NextResponse.json({ error: "estado must be 'en_curso' or 'finalizada'" }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from("materias")
    .update({ estado })
    .eq("slug", slug);

  if (error) throw error;

  return NextResponse.json({ ok: true });
}
