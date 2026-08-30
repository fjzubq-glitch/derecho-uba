import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const sb = getSupabaseAdmin();

    const { error } = await sb.rpc("exec_sql" as never, {
      query: `
        CREATE TABLE IF NOT EXISTS accesos_especiales (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          nombre TEXT NOT NULL,
          materia_id UUID NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE(nombre, materia_id)
        );
      `,
    } as never);

    if (error) {
      const msg = String(error.message || error);
      if (msg.includes("function") && msg.includes("does not exist")) {
        return NextResponse.json(
          {
            error:
              "La función exec_sql no existe. Creá la tabla manualmente en el SQL Editor de Supabase con: CREATE TABLE accesos_especiales (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, nombre TEXT NOT NULL, materia_id UUID NOT NULL REFERENCES materias(id) ON DELETE CASCADE, created_at TIMESTAMPTZ DEFAULT now(), UNIQUE(nombre, materia_id));",
          },
          { status: 500 }
        );
      }
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
