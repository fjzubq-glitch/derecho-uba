import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const esc = (s = "") => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s = "") => esc(s).replace(/\*(.+?)\*/g, "<b>$1</b>");
const paragraphs = (s = "") =>
  s.split(/\n\n+/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${inline(p).replace(/\n/g, "<br>")}</p>`).join("");

function renderMaterial(material = []) {
  return material
    .map((m) => {
      const badges = (m.badges || []).map((b) => `<span class="badge ${b.kind || "info"}">${esc(b.text)}</span>`).join("");
      const enun = m.enunciado ? `<div class="enunciado-q">${inline(m.enunciado)}</div>` : "";
      const ctx = m.contexto ? `<div class="contexto-caso"><span class="et">CASO</span>${inline(m.contexto)}</div>` : "";
      const resp = m.respuesta ? `<div class="respuesta">${paragraphs(m.respuesta)}</div>` : "";
      const err = m.errorTipico ? `<div class="error-detail"><b>⚠️ Error típico:</b> ${inline(m.errorTipico)}</div>` : "";
      const tbl = m.table
        ? `<table class="tbl"><thead><tr>${m.table.headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${m.table.rows
            .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
            .join("")}</tbody></table>`
        : "";
      const contra = m.contrafactual ? `<div class="contrafactual"><span class="et">CONTRAFÁCTICO</span>${inline(m.contrafactual)}</div>` : "";
      const link = m.linkRel ? `<div class="link-rel"><b>↪ Relacionado:</b> ${esc(m.linkRel)}</div>` : "";
      return `<section class="mat-section">
        <div class="section-head"><h3>${esc(m.title)}</h3>${badges}</div>
        ${enun}${ctx}${resp}${tbl}${err}${contra}${link}
      </section>`;
    })
    .join("\n");
}

function generar(template, data) {
  return template
    .replace("__TITLE__", esc(data.header.title))
    .replace("__HEADER_TITLE__", esc(data.header.title))
    .replace("__HEADER_SUB__", esc(data.header.sub))
    .replace("__HEADER_META__", esc(data.header.meta))
    .replace("__STORAGE_KEY__", data.storageKey || "quiz_progress")
    .replace("__QUESTIONS__", JSON.stringify(data.questions, null, 2))
    .replace("<!-- MATERIAL -->", renderMaterial(data.material));
}

const [, , input] = process.argv;
const jsonPath = input || path.join(root, "content", "cuestionarios", "contratos-clase1.json");
const data = JSON.parse(readFileSync(jsonPath, "utf-8"));
const template = readFileSync(path.join(root, "public", "plantilla-cuestionario.html"), "utf-8");
const html = generar(template, data);
const out = path.join(root, "content", "cuestionarios", data.header.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".html");
writeFileSync(out, html, "utf-8");
console.log("Generado:", out, `(${html.length} bytes)`);
