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
