import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
export const dynamic = "force-dynamic";

// Valida si un visitante (por nombre + clave) tiene acceso especial de lectura
// a una materia. Responde solo ok:true/false, sin exponer datos de la tabla.
export async function GET(request: NextRequest) {
  const clave = request.nextUrl.searchParams.get("clave");
  const nombre = request.nextUrl.searchParams.get("nombre");
  const materiaId = request.nextUrl.searchParams.get("materia_id");

  if (!clave || !nombre || !materiaId) {
    return NextResponse.json({ ok: false });
  }

  try {
    const { data } = await getSupabaseAdmin()
      .from("accesos_especiales")
      .select("id")
      .eq("materia_id", materiaId)
      .eq("clave", clave.trim().toUpperCase())
      .ilike("nombre", nombre.trim())
      .maybeSingle();

    return NextResponse.json({ ok: !!data });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
