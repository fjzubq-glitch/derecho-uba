import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return unauthorized();
  }

  try {
    const { materia_id, titulo, fecha } = await request.json();

    if (!materia_id || !titulo || typeof titulo !== "string" || !titulo.trim()) {
      return NextResponse.json({ error: "materia_id y titulo requeridos" }, { status: 400 });
    }
    if (!fecha || typeof fecha !== "string" || !FECHA_RE.test(fecha)) {
      return NextResponse.json({ error: "fecha inválida (formato YYYY-MM-DD)" }, { status: 400 });
    }

    const { error } = await getSupabaseAdmin()
      .from("materia_fechas")
      .insert({ materia_id, titulo: titulo.trim(), fecha });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Fechas create error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return unauthorized();
  }

  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id requerido" }, { status: 400 });
    }

    const { error } = await getSupabaseAdmin().from("materia_fechas").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Fechas delete error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}