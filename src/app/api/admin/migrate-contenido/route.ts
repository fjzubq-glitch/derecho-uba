import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { uploadToR2 } from "@/lib/r2";
import { getSupabaseAdmin } from "@/lib/supabase";
import { CuestionarioData, generarCuestionarioHTML } from "@/lib/cuestionario";
import { isAdminRequest } from "@/lib/auth";

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

function extractClase(title: string): string | null {
  const match = title.match(/clase\s*(\d+)/i);
  return match ? match[1] : null;
}

function extractMateria(title: string): string | null {
  const match = title.match(/(comercial|contratos|civil)/i);
  return match ? match[1].toLowerCase() : null;
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
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

      const match = archivos?.find(a => {
        const name = a.nombre_display || "";
        const titleClase = extractClase(title);
        const nameClase = extractClase(name);
        if (titleClase && nameClase && titleClase === nameClase) {
          const titleMat = extractMateria(title);
          const nameMat = extractMateria(name);
          if (!titleMat || !nameMat || titleMat === nameMat) return true;
        }
        const titleNorm = normalize(title);
        const nameNorm = normalize(name);
        return nameNorm.includes(titleNorm) || titleNorm.includes(nameNorm);
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

    return NextResponse.json({ ok: true, migrated, total: jsonFiles.length, results, dbNames: archivos?.map(a => ({ id: a.id, name: a.nombre_display, key: a.storage_key })) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
