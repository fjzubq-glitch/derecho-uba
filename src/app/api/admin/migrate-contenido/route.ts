import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { uploadToR2 } from "@/lib/r2";
import { getSupabaseAdmin } from "@/lib/supabase";
import { CuestionarioData, generarCuestionarioHTML } from "@/lib/cuestionario";

async function readJsonFiles(dir: string): Promise<{ filePath: string; data: CuestionarioData }[]> {
  const results: { filePath: string; data: CuestionarioData }[] = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...await readJsonFiles(fullPath));
      } else if (entry.name.endsWith(".json")) {
        const raw = await fs.readFile(fullPath, "utf-8");
        const data = JSON.parse(raw) as CuestionarioData;
        if (data.header && Array.isArray(data.questions)) {
          results.push({ filePath: fullPath, data });
        }
      }
    }
  } catch { }
  return results;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function POST() {
  try {
    const contentDir = path.join(process.cwd(), "content", "cuestionarios");
    const jsonFiles = await readJsonFiles(contentDir);

    if (jsonFiles.length === 0) {
      return NextResponse.json({ ok: true, migrated: 0, message: "No se encontraron JSON en content/cuestionarios/" });
    }

    const { data: archivos, error } = await getSupabaseAdmin()
      .from("archivos")
      .select("id, storage_key, nombre_display")
      .eq("tipo", "cuestionario");

    if (error) throw new Error(error.message);

    const plantillaPath = path.join(process.cwd(), "public", "plantilla-cuestionario.html");
    const plantilla = await fs.readFile(plantillaPath, "utf-8");

    let migrated = 0;
    const results: string[] = [];

    for (const json of jsonFiles) {
      const title = json.data.header.title;
      const titleNorm = normalize(title);

      const match = archivos?.find(a => {
        const name = a.nombre_display || "";
        return normalize(name).includes(titleNorm) || titleNorm.includes(normalize(name));
      });

      if (!match || !match.storage_key) {
        results.push(`SKIP: "${title}" — no se encontró archivo en BD`);
        continue;
      }

      try {
        const html = generarCuestionarioHTML(plantilla, json.data);
        await uploadToR2(match.storage_key, Buffer.from(html, "utf-8"), "text/html; charset=utf-8");

        const { error: updErr } = await getSupabaseAdmin()
          .from("archivos")
          .update({ contenido: json.data })
          .eq("id", match.id);

        if (updErr) throw new Error(updErr.message);
        migrated++;
        results.push(`OK: "${title}" → ${match.nombre_display}`);
      } catch (e) {
        results.push(`ERROR: "${title}" — ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return NextResponse.json({ ok: true, migrated, total: jsonFiles.length, results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
