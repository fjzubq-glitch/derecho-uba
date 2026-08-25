import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { uploadToR2 } from "@/lib/r2";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";
import { CuestionarioData, generarCuestionarioHTML } from "@/lib/cuestionario";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const { id } = params;
    const body = await request.json();
    const contenido = body.contenido as CuestionarioData | undefined;
    if (!contenido || !contenido.questions || !Array.isArray(contenido.questions)) {
      return NextResponse.json({ error: "contenido inválido" }, { status: 400 });
    }

    const { data: archivo, error: loadErr } = await getSupabaseAdmin()
      .from("archivos")
      .select("id, storage_key, tipo")
      .eq("id", id)
      .single();
    if (loadErr || !archivo) {
      return NextResponse.json({ error: "Cuestionario no encontrado" }, { status: 404 });
    }
    if (archivo.tipo !== "cuestionario" || !archivo.storage_key) {
      return NextResponse.json({ error: "El archivo no es un cuestionario válido" }, { status: 400 });
    }

    const plantillaPath = path.join(process.cwd(), "public", "plantilla-cuestionario.html");
    const plantilla = await fs.readFile(plantillaPath, "utf-8");
    const html = generarCuestionarioHTML(plantilla, contenido);

    await uploadToR2(archivo.storage_key, Buffer.from(html, "utf-8"), "text/html; charset=utf-8");

    const { error: updErr } = await getSupabaseAdmin()
      .from("archivos")
      .update({ contenido })
      .eq("id", id);
    if (updErr) {
      return NextResponse.json({ error: "Error al guardar: " + updErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
