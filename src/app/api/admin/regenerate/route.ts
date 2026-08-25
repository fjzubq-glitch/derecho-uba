import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { uploadToR2 } from "@/lib/r2";
import { getSupabaseAdmin } from "@/lib/supabase";
import { CuestionarioData, generarCuestionarioHTML } from "@/lib/cuestionario";

export async function POST() {
  try {
    const { data: archivos, error } = await getSupabaseAdmin()
      .from("archivos")
      .select("id, storage_key, nombre_display, contenido")
      .eq("tipo", "cuestionario");

    if (error) throw new Error(error.message);
    if (!archivos || archivos.length === 0) {
      return NextResponse.json({ ok: true, regenerated: 0, message: "No hay cuestionarios" });
    }

    const plantillaPath = path.join(process.cwd(), "public", "plantilla-cuestionario.html");
    const plantilla = await fs.readFile(plantillaPath, "utf-8");

    let regenerated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const archivo of archivos) {
      if (!archivo.storage_key) { skipped++; continue; }
      if (!archivo.contenido || typeof archivo.contenido !== "object") { skipped++; continue; }

      try {
        const contenido = archivo.contenido as unknown as CuestionarioData;
        if (!contenido.questions || !Array.isArray(contenido.questions)) { skipped++; continue; }

        const html = generarCuestionarioHTML(plantilla, contenido);
        await uploadToR2(archivo.storage_key, Buffer.from(html, "utf-8"), "text/html; charset=utf-8");
        regenerated++;
      } catch (e) {
        errors.push(`${archivo.nombre_display}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return NextResponse.json({ ok: true, regenerated, skipped, total: archivos.length, names: archivos.map(a => a.nombre_display), errors: errors.length > 0 ? errors : undefined });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
