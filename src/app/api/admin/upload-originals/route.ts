import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getSupabaseAdmin } from "@/lib/supabase";
import { uploadToR2 } from "@/lib/r2";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST() {
  try {
    const supabase = getSupabaseAdmin();
    const { data: archivos, error } = await supabase
      .from("archivos")
      .select("id, storage_key, nombre_display, clase_id")
      .eq("tipo", "cuestionario");

    if (error) throw new Error(error.message);
    if (!archivos || archivos.length === 0) {
      return NextResponse.json({ ok: true, uploaded: 0, message: "No hay cuestionarios" });
    }

    const claseIds = [...new Set(archivos.map((a) => a.clase_id).filter(Boolean))];
    const { data: clases } = claseIds.length > 0
      ? await supabase.from("clases").select("id, numero, materias!inner(slug)").in("id", claseIds)
      : { data: [] };

    const claseMap = new Map(
      (clases || []).map((c: any) => [c.id, { slug: c.materias?.slug || "", numero: c.numero }])
    );

    const originalsDir = path.join(process.cwd(), "content", "cuestionarios");
    const files = await fs.readdir(originalsDir);
    const notionFiles = files.filter((f) => f.endsWith("-notion.html"));

    const fileSlugs: Record<string, string> = {};
    for (const f of notionFiles) {
      const slug = slugify(f.replace("-notion.html", ""));
      fileSlugs[slug] = f;
    }

    let uploaded = 0;
    const results: Array<{ nombre: string; key: string; file: string; status: string; size?: number; error?: string }> = [];

    for (const archivo of archivos) {
      if (!archivo.storage_key) {
        results.push({ nombre: archivo.nombre_display, key: "", file: "", status: "skipped", error: "No storage_key" });
        continue;
      }

      const info = claseMap.get(archivo.clase_id || "");
      if (!info) {
        results.push({ nombre: archivo.nombre_display, key: archivo.storage_key, file: "", status: "skipped", error: "No clase info" });
        continue;
      }

      const expectedSlug = `${info.slug}-clase${info.numero}`;
      const matchedFile = fileSlugs[expectedSlug];

      if (!matchedFile) {
        results.push({
          nombre: archivo.nombre_display,
          key: archivo.storage_key,
          file: "",
          status: "skipped",
          error: `No file for "${expectedSlug}"`,
        });
        continue;
      }

      try {
        const filePath = path.join(originalsDir, matchedFile);
        const html = await fs.readFile(filePath, "utf-8");
        await uploadToR2(archivo.storage_key, Buffer.from(html, "utf-8"), "text/html; charset=utf-8");
        uploaded++;
        results.push({ nombre: archivo.nombre_display, key: archivo.storage_key, file: matchedFile, status: "ok", size: html.length });
      } catch (e) {
        results.push({
          nombre: archivo.nombre_display,
          key: archivo.storage_key,
          file: matchedFile,
          status: "error",
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return NextResponse.json({ ok: true, uploaded, total: archivos.length, notion_files: notionFiles.length, results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
