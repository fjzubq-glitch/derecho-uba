import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
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

export async function PUT(request: Request) {
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
