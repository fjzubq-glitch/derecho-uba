// Importa la Base Infoleg de Normativa Nacional (datos.jus.gob.ar) a Supabase.
//
// Uso:
//   node scripts/importar-infoleg.mjs                 # descarga + importa todo
//   node scripts/importar-infoleg.mjs --limit 5000    # importa solo 5000 (test)
//   node scripts/importar-infoleg.mjs --csv <ruta>    # usa un CSV ya descargado
//
// Solo importa los tipos relevantes para LexSearch: Ley, Decreto, Decreto/Ley, Acordada.

import { createClient } from "@supabase/supabase-js";
import { createReadStream, existsSync, mkdirSync, rmSync, statSync } from "fs";
import { execFileSync } from "child_process";
import { createInterface } from "readline";
import { fileURLToPath } from "url";
import path from "path";
import os from "os";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

dotenv.config({ path: path.join(root, ".env.local") });

const ZIP_URL =
  "https://datos.jus.gob.ar/dataset/d9a963ea-8b1d-4ca3-9dd9-07a4773e8c23/resource/bf0ec116-ad4e-4572-a476-e57167a84403/download/base-infoleg-normativa-nacional.zip";

const TIPOS_INCLUIDOS = new Set(["Ley", "Decreto", "Decreto/Ley", "Acordada"]);
const BATCH_SIZE = 800;

const args = process.argv.slice(2);
const limitArg = args.indexOf("--limit");
const csvArg = args.indexOf("--csv");
const LIMIT = limitArg !== -1 ? parseInt(args[limitArg + 1], 10) : 0;
const CSV_PATH_OVERRIDE = csvArg !== -1 ? args[csvArg + 1] : "";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

function parseCSVLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function toDate(value) {
  const v = (value || "").trim();
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return null;
}

function toInt(value) {
  const n = parseInt((value || "").trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

async function descargarYExtraer() {
  const cacheDir = path.join(os.tmpdir(), "infoleg-import");
  const zipPath = path.join(cacheDir, "base-infoleg.zip");
  const extractDir = path.join(cacheDir, "extraido");
  const csvPath = path.join(extractDir, "base-infoleg-normativa-nacional.csv");

  if (existsSync(csvPath)) {
    console.log(`CSV ya en cache: ${csvPath}`);
    return csvPath;
  }

  mkdirSync(cacheDir, { recursive: true });

  if (!existsSync(zipPath) || statSync(zipPath).size < 40_000_000) {
    console.log("Descargando ZIP (~50 MB)...");
    const res = await fetch(ZIP_URL);
    if (!res.ok) throw new Error(`Descarga falló: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const { writeFileSync } = await import("fs");
    writeFileSync(zipPath, buf);
    console.log(`Descargado: ${(buf.length / 1e6).toFixed(1)} MB`);
  }

  console.log("Extrayendo...");
  if (existsSync(extractDir)) rmSync(extractDir, { recursive: true, force: true });
  mkdirSync(extractDir, { recursive: true });

  if (process.platform === "win32") {
    execFileSync("powershell", [
      "-NoProfile",
      "-Command",
      `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${extractDir}' -Force`,
    ]);
  } else {
    execFileSync("unzip", ["-o", zipPath, "-d", extractDir]);
  }

  if (!existsSync(csvPath)) throw new Error(`No se encontró el CSV en ${csvPath}`);
  return csvPath;
}

async function importar() {
  const csvPath = CSV_PATH_OVERRIDE || (await descargarYExtraer());
  console.log(`Leyendo ${csvPath}`);

  const rl = createInterface({
    input: createReadStream(csvPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let header = null;
  let leidos = 0;
  let filtrados = 0;
  let insertados = 0;
  let batch = [];

  const flush = async () => {
    if (batch.length === 0) return;
    const lote = batch;
    batch = [];
    for (let intento = 1; intento <= 4; intento++) {
      const { error } = await supabase
        .from("leyes_infoleg")
        .upsert(lote, { onConflict: "id_norma" });
      if (!error) {
        insertados += lote.length;
        process.stdout.write(`\r  Importados: ${insertados}`);
        return;
      }
      if (intento === 4) {
        console.error(`\nError en lote de ${lote.length}:`, error.message);
        throw error;
      }
      await new Promise((r) => setTimeout(r, 1000 * intento));
    }
  };

  for await (const line of rl) {
    if (!header) {
      header = parseCSVLine(line);
      continue;
    }
    if (!line.trim()) continue;
    leidos++;

    const c = parseCSVLine(line);
    const tipo = (c[1] || "").trim();
    if (!TIPOS_INCLUIDOS.has(tipo)) continue;

    filtrados++;
    batch.push({
      id_norma: (c[0] || "").trim(),
      tipo_norma: tipo,
      numero_norma: (c[2] || "").trim(),
      clase_norma: (c[3] || "").trim(),
      organismo_origen: (c[4] || "").trim(),
      fecha_sancion: toDate(c[5]),
      titulo_resumido: (c[9] || "").trim(),
      titulo_sumario: (c[10] || "").trim(),
      texto_resumido: (c[11] || "").trim(),
      texto_original: (c[13] || "").trim(),
      texto_actualizado: (c[14] || "").trim(),
      modificada_por: toInt(c[15]),
      modifica_a: toInt(c[16]),
    });

    if (batch.length >= BATCH_SIZE) await flush();
    if (LIMIT && filtrados >= LIMIT) break;
  }

  await flush();
  rl.close();

  console.log(`\nListo. Leídos: ${leidos}, filtrados: ${filtrados}, importados: ${insertados}`);
}

importar().catch((err) => {
  console.error("\nFalló la importación:", err);
  process.exit(1);
});
