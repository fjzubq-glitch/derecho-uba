import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";

export async function GET(request: Request) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("fichas")
    .select("id, titulo, contenido, materia_id, tags, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const titulo = typeof body.titulo === "string" ? body.titulo.trim() : "";
  const contenido = typeof body.contenido === "string" ? body.contenido : "";
  const materiaId = typeof body.materia_id === "string" ? body.materia_id : null;
  const tags = Array.isArray(body.tags) ? body.tags.map(String) : [];

  if (!titulo) {
    return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("fichas")
    .insert({ titulo, contenido, materia_id: materiaId || null, tags })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
