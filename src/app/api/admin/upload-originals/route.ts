import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";
import { uploadToR2 } from "@/lib/r2";

const NOTION_CSS = {
  "#0f1724": "#191919",
  "#182233": "#232323",
  "#1f2c40": "#2d2d2d",
  "#6b9bd1": "#e0e0e0",
  "#8bb3dc": "#ffffff",
  "#4a7fc1": "#999999",
  "#2a3a52": "#333333",
  "#223047": "#2a2a2a",
  "#e8f1f8": "#ebebeb",
  "#c5d3e3": "#cccccc",
  "#8a9bb2": "#888888",
  "#1a2a42": "#222222",
};

const NOTION_VARS: Record<string, string> = {
  "--bg": "#191919",
  "--bg-2": "#232323",
  "--bg-3": "#2d2d2d",
  "--accent": "#e0e0e0",
  "--accent-soft": "#ffffff",
  "--accent-bg": "rgba(255,255,255,0.06)",
  "--border": "#333333",
  "--border-2": "#2a2a2a",
  "--text": "#ebebeb",
  "--text-2": "#cccccc",
  "--text-dim": "#888888",
};

function applyNotionTheme(html: string): string {
  let out = html;
  for (const [hex, notion] of Object.entries(NOTION_CSS)) {
    out = out.replaceAll(hex, notion);
  }
  for (const [varName, val] of Object.entries(NOTION_VARS)) {
    out = out.replace(new RegExp(`${varName}:\\s*#[0-9a-fA-F]+;`, "g"), `${varName}: ${val};`);
  }
  out = out.replaceAll("rgba(107,155,209,0.35)", "rgba(255,255,255,0.1)");
  return out;
}

const FILE_MAP: Record<string, string> = {
  "contratos-clase2": "Contratos · Clase 2",
  "contratos-clase3": "Contratos · Clase 3",
  "comercial-clase2": "Comercial · Clase 2",
  "comercial-clase3": "Comercial · Clase 3",
  "comercial-clase4": "Comercial · Clase 4",
  "comercial-clase5": "Comercial · Clase 5",
};

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: cuestionarios } = await supabase
      .from("archivos")
      .select("id, nombre_display, storage_key")
      .eq("tipo", "cuestionario");

    if (!cuestionarios || cuestionarios.length === 0) {
      return NextResponse.json({ error: "No hay cuestionarios en la DB" });
    }

    const results: Array<{ nombre: string; status: string; size?: number; error?: string }> = [];

    for (const cq of cuestionarios) {
      const nombreNorm = (cq.nombre_display || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const entry = Object.entries(FILE_MAP).find(([, title]) => {
        const titleNorm = title.toLowerCase().replace(/[^a-z0-9]/g, "");
        return nombreNorm.includes(titleNorm) || titleNorm.includes(nombreNorm);
      });

      if (!entry) {
        results.push({ nombre: cq.nombre_display, status: "skipped", error: "No match found" });
        continue;
      }

      const [slug] = entry;
      const htmlPath = `content/cuestionarios/${slug}-notion.html`;

      try {
        const { promises: fs } = await import("fs");
        const pathMod = await import("path");
        const fullPath = pathMod.join(process.cwd(), htmlPath);
        const html = await fs.readFile(fullPath, "utf-8");

        const key = cq.storage_key || `uploads/${slug}-notion-${Date.now()}.html`;
        await uploadToR2(key, Buffer.from(html, "utf-8"), "text/html; charset=utf-8");

        if (!cq.storage_key) {
          await supabase.from("archivos").update({ storage_key: key }).eq("id", cq.id);
        }

        results.push({ nombre: cq.nombre_display, status: "ok", size: html.length });
      } catch (e) {
        results.push({ nombre: cq.nombre_display, status: "error", error: e instanceof Error ? e.message : String(e) });
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
