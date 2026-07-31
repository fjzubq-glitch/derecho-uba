// Renombra los títulos de las clases con nombres descriptivos.
//
// Uso:
//   1. Llená el mapeo TITULOS con { slug_de_materia: { numero_de_clase: "Título descriptivo" } }
//   2. node scripts/renombrar-clases.mjs
//
// Los valores actuales se consultan a la API pública; solo se actualizan
// los que aparecen en el mapeo.
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// ── MAPEO: editá acá ──
// Ejemplo: "contratos-i": { 1: "Formación del contrato", 2: "Oferta y aceptación" }
const TITULOS = {};

async function main() {
  if (Object.keys(TITULOS).length === 0) {
    console.log("El mapeo TITULOS está vacío. Llenalo con los títulos descriptivos y volvé a correr.");
      const { data: materias } = await supabase.from("materias").select("id, slug, nombre");
    console.log("\nMaterias disponibles (slugs):");
    for (const m of materias || []) {
      console.log(`  ${m.slug}  <-  ${m.nombre}`);
      const { data: clases } = await supabase.from("clases").select("numero, titulo").eq("materia_id", m.id).order("numero");
      for (const c of clases || []) {
        console.log(`      ${c.numero}. ${c.titulo}`);
      }
    }
    return;
  }

  for (const [slug, porNumero] of Object.entries(TITULOS)) {
    const { data: materia } = await supabase.from("materias").select("id").eq("slug", slug).single();
    if (!materia) {
      console.error(`  Materia "${slug}" no encontrada`);
      continue;
    }

    for (const [numero, titulo] of Object.entries(porNumero)) {
      const { data: clase, error } = await supabase
        .from("clases")
        .select("id, titulo")
        .eq("materia_id", materia.id)
        .eq("numero", Number(numero))
        .single();

      if (error || !clase) {
        console.error(`  [${slug}] Clase ${numero} no encontrada`);
        continue;
      }

      const { error: upd } = await supabase
        .from("clases")
        .update({ titulo })
        .eq("id", clase.id);

      if (upd) {
        console.error(`  [${slug}] Clase ${numero} -> error: ${upd.message}`);
      } else {
        console.log(`  [${slug}] Clase ${numero}: "${clase.titulo}" -> "${titulo}"`);
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
