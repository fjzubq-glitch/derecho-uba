import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";
import { getObjectBuffer } from "@/lib/r2";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const { data: archivo } = await getSupabaseAdmin()
      .from("archivos")
      .select("storage_key, contenido_texto, tipo")
      .eq("id", id)
      .single();

    if (!archivo || archivo.tipo !== "cuestionario") {
      return NextResponse.json({ error: "Cuestionario no encontrado" }, { status: 404 });
    }

    if (archivo.storage_key) {
      try {
        const buf = await getObjectBuffer(archivo.storage_key);
        return new NextResponse(buf.toString("utf-8"), {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      } catch {
        // R2 no tiene el archivo, intentar contenido_texto
      }
    }

    if (archivo.contenido_texto) {
      return new NextResponse(archivo.contenido_texto, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return NextResponse.json({ error: "Sin contenido HTML" }, { status: 404 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
