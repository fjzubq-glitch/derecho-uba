import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return unauthorized();
  }

  const materiaId = request.nextUrl.searchParams.get("materia_id");
  if (!materiaId) {
    return NextResponse.json({ error: "materia_id requerido" }, { status: 400 });
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("accesos_especiales")
      .select("id, nombre, materia_id, created_at")
      .eq("materia_id", materiaId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ ok: true, accesos: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return unauthorized();
  }

  try {
    const { nombre, materia_id } = await request.json();

    if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
      return NextResponse.json({ error: "nombre requerido" }, { status: 400 });
    }
    if (!materia_id || typeof materia_id !== "string") {
      return NextResponse.json({ error: "materia_id requerido" }, { status: 400 });
    }

    const { data, error } = await getSupabaseAdmin()
      .from("accesos_especiales")
      .insert({ nombre: nombre.trim(), materia_id })
      .select("id, nombre, materia_id, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Ya existe acceso para ese nombre en esta materia" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ ok: true, acceso: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return unauthorized();
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  try {
    const { error } = await getSupabaseAdmin()
      .from("accesos_especiales")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
