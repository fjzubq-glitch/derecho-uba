import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const NOTION_COLORS = {
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

function applyNotionTheme(html) {
  let out = html;
  for (const [var_, val] of Object.entries(NOTION_COLORS)) {
    out = out.replace(new RegExp(`${var_}:\\s*#[0-9a-fA-F]+;`, "g"), `${var_}: ${val};`);
  }
  out = out.replace(/#0f1724/g, "#191919");
  out = out.replace(/#1a2a42/g, "#222222");
  out = out.replace(/#6b9bd1/g, "#e0e0e0");
  out = out.replace(/#8bb3dc/g, "#ffffff");
  out = out.replace(/#4a7fc1/g, "#999999");
  out = out.replace(/rgba\(107,155,209,0\.35\)/g, "rgba(255,255,255,0.1)");
  return out;
}

const FILES = {
  "Contratos Clase 2.txt": "contratos-clase2",
  "Contratos Clase 3.txt": "contratos-clase3",
  "Cuestionario Comercial_Clase 2.txt": "comercial-clase2",
  "Cuestionario Comercial_Clase 3.txt": "comercial-clase3",
  "Cuestionario Comercial_Clase 4.txt": "comercial-clase4",
  "Cuestionario Comercial_Clase 5.txt": "comercial-clase5",
};

const originalsDir = path.join(root, "content", "cuestionarios", "originals");

console.log("Procesando originales con tema Notion...\n");

for (const [filename, slug] of Object.entries(FILES)) {
  const filePath = path.join(originalsDir, filename);
  try {
    const raw = readFileSync(filePath, "utf-8");
    const themed = applyNotionTheme(raw);
    const outPath = path.join(root, "content", "cuestionarios", `${slug}-notion.html`);
    const { writeFileSync } = await import("fs");
    writeFileSync(outPath, themed, "utf-8");
    console.log(`✓ ${filename} → ${slug}-notion.html (${themed.length} bytes)`);
  } catch (e) {
    console.error(`✗ ${filename}: ${e.message}`);
  }
}

console.log("\nArchivos generados. Ahora ejecutá: curl -X POST https://derecho-uba-orpin.vercel.app/api/admin/upload-originals");
