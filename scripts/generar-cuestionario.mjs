import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const esc = (s = "") => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s = "") => esc(s).replace(/\*(.+?)\*/g, "<b>$1</b>");
const hasHtml = (s = "") => /<[a-z][\s\S]*>/i.test(s);
const paragraphs = (s = "") =>
  s.split(/\n\n+/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${inline(p).replace(/\n/g, "<br>")}</p>`).join("");

function renderMaterial(material = []) {
  return material
    .map((m) => {
      const badgeClass = (kind) => {
        switch (kind) {
          case "fuente": return "fuente";
          case "pareto": return "pareto";
          case "trampa": return "trampa";
          case "cae": return "cae";
          default: return "fuente";
        }
      };
      const badges = (m.badges || []).map((b) => `<span class="badge ${badgeClass(b.kind)}">${esc(b.text)}</span>`).join("");
      const enun = m.enunciado ? `<p class="enunciado-q">${inline(m.enunciado)}</p>` : "";
      const ctx = m.contexto ? `<div class="contexto-caso">${inline(m.contexto)}</div>` : "";
      const tbl = m.table
        ? `<table><thead><tr>${m.table.headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${m.table.rows
            .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
            .join("")}</tbody></table>`
        : "";
      const resp = m.respuesta
        ? `<details><summary>Ver resolución</summary><div class="detail-content">${m.table ? tbl : hasHtml(m.respuesta) ? m.respuesta : paragraphs(m.respuesta)}</div></details>`
        : "";
      const err = m.errorTipico ? `<details class="error-detail"><summary>Ver error típico</summary><div class="detail-content"><b>❌ Error típico:</b> ${inline(m.errorTipico)}</div></details>` : "";
      const contra = m.contrafactual ? `<div class="contrafactico"><b>Sub-escenario contrafáctico:</b> ${inline(m.contrafactual)}</div>` : "";
      const link = m.linkRel ? `<p class="link-rel">🔗 ${esc(m.linkRel)}</p>` : "";
      return `<div class="mat-section" id="${esc(m.id)}">
        <div class="section-head"><h3>${esc(m.title)}</h3><div class="badges">${badges}</div></div>
        ${enun}${ctx}${resp}${err}${contra}${link}
      </div>`;
    })
    .join("\n");
}

function renderToc(material = []) {
  const groups = {};
  material.forEach((m) => {
    const isCaso = /^\s*Caso|^\s*Integradora|^\s*1\.\s*Caso/i.test(m.title);
    const isMapa = /^\s*Top Pareto|^\s*Fuentes/i.test(m.title);
    const key = isCaso ? "Casos" : isMapa ? "Mapas" : "Cuestionario";
    (groups[key] = groups[key] || []).push(m);
  });
  const order = ["Cuestionario", "Casos", "Mapas"];
  return order
    .filter((g) => groups[g] && groups[g].length)
    .map((g) => `<div class="toc-group"><div class="toc-group-title">${g}</div>${groups[g]
      .map((m) => `<a href="#${esc(m.id)}">${esc(m.title)}</a>`)
      .join("")}</div>`)
    .join("\n");
}

function generar(template, data) {
  const total = data.questions.length;
  const casos = data.questions.filter((q) => /^(C|INT)/i.test(q.id)).length;
  return template
    .replace("__TITLE__", esc(data.header.title))
    .replaceAll("__TITLE__", esc(data.header.title))
    .replace("__HEADER_SUB__", esc(data.header.sub))
    .replace("__HEADER_META__", esc(data.header.meta))
    .replace("__STORAGE_KEY__", data.storageKey || "quiz_progress")
    .replace("__QUESTIONS__", JSON.stringify(data.questions, null, 2))
    .replace("__STAT_TOTAL__", String(total))
    .replace("__STAT_CASES__", String(casos))
    .replace("__MATERIAL_TITLE__", esc(data.header.sub))
    .replace("__TOC__", renderToc(data.material))
    .replace("__MATERIAL__", renderMaterial(data.material));
}

const [, , input] = process.argv;
const jsonPath = input || path.join(root, "content", "cuestionarios", "contratos", "contratos-clase1.json");
const data = JSON.parse(readFileSync(jsonPath, "utf-8"));
const template = readFileSync(path.join(root, "public", "plantilla-cuestionario.html"), "utf-8");
const html = generar(template, data);
const out = path.join(root, "content", "cuestionarios", data.header.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".html");
writeFileSync(out, html, "utf-8");
console.log("Generado:", out, `(${html.length} bytes)`);
