import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieHeader = request.headers.get("cookie");
  if (!isAdminRequest(cookieHeader)) {
    console.error("[fichas PUT] Auth falló. Cookie presente:", !!cookieHeader);
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const updates: { titulo?: string; contenido?: string; materia_id?: string | null; clase_id?: string | null; tags?: string[] } = {};

  if (typeof body.titulo === "string") updates.titulo = body.titulo.trim();
  if (typeof body.contenido === "string") updates.contenido = body.contenido;
  if ("materia_id" in body) updates.materia_id = body.materia_id || null;
  if ("clase_id" in body) updates.clase_id = body.clase_id || null;
  if (Array.isArray(body.tags)) updates.tags = body.tags.map(String);

  if (updates.titulo === "") {
    return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });
  }

  console.error("[fichas PUT] Actualizando id:", id, "updates:", JSON.stringify(updates).slice(0, 200));

  const { data, error } = await getSupabaseAdmin()
    .from("fichas")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[fichas PUT] Error de Supabase:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const { error } = await getSupabaseAdmin().from("fichas").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
