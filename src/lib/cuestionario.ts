export type MaterialBadge = { text: string; kind?: "fuente" | "pareto" | "trampa" | "cae" | "info" };

export type MaterialSection = {
  id: string;
  title: string;
  badges?: MaterialBadge[];
  enunciado?: string;
  contexto?: string;
  respuesta?: string;
  errorTipico?: string;
  table?: { headers: string[]; rows: string[][] };
  contrafactual?: string;
  linkRel?: string;
};

export type CuestionarioQuestion = {
  id: string;
  topic: string;
  priority: "critico" | "alto" | "medio";
  enunciado: string;
  pista?: string;
  respuestaLibre?: string;
  opciones: string[];
  correcta: number;
  explicacion: string;
  errorTipico?: string;
  contexto?: string;
};

export type CuestionarioData = {
  header: { title: string; sub: string; meta: string };
  storageKey?: string;
  questions: CuestionarioQuestion[];
  material: MaterialSection[];
};

const esc = (s: string = "") =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const inline = (s: string = "") =>
  esc(s).replace(/\*(.+?)\*/g, "<b>$1</b>");

const paragraphs = (s: string = "") =>
  s
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${inline(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

export function renderMaterial(material: MaterialSection[]): string {
  return material
    .map((m) => {
      const badges = (m.badges || [])
        .map(
          (b) =>
            `<span class="badge ${b.kind || "info"}">${esc(b.text)}</span>`
        )
        .join("");
      const enun = m.enunciado ? `<div class="enunciado-q">${inline(m.enunciado)}</div>` : "";
      const ctx = m.contexto
        ? `<div class="contexto-caso"><span class="et">CASO</span>${inline(m.contexto)}</div>`
        : "";
      const resp = m.respuesta ? `<div class="respuesta">${paragraphs(m.respuesta)}</div>` : "";
      const err = m.errorTipico
        ? `<div class="error-detail"><b>⚠️ Error típico:</b> ${inline(m.errorTipico)}</div>`
        : "";
      const tbl = m.table
        ? `<table class="tbl"><thead><tr>${m.table.headers
            .map((h) => `<th>${esc(h)}</th>`)
            .join("")}</tr></thead><tbody>${m.table.rows
            .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
            .join("")}</tbody></table>`
        : "";
      const contra = m.contrafactual
        ? `<div class="contrafactual"><span class="et">CONTRAFÁCTICO</span>${inline(m.contrafactual)}</div>`
        : "";
      const link = m.linkRel
        ? `<div class="link-rel"><b>↪ Relacionado:</b> ${esc(m.linkRel)}</div>`
        : "";
      return `<section class="mat-section">
        <div class="section-head"><h3>${esc(m.title)}</h3>${badges}</div>
        ${enun}${ctx}${resp}${tbl}${err}${contra}${link}
      </section>`;
    })
    .join("\n");
}

export function generarCuestionarioHTML(template: string, data: CuestionarioData): string {
  const key = data.storageKey || "quiz_progress";
  return template
    .replace("__TITLE__", esc(data.header.title))
    .replace("__HEADER_TITLE__", esc(data.header.title))
    .replace("__HEADER_SUB__", esc(data.header.sub))
    .replace("__HEADER_META__", esc(data.header.meta))
    .replace("__STORAGE_KEY__", key)
    .replace("__QUESTIONS__", JSON.stringify(data.questions, null, 2))
    .replace("<!-- MATERIAL -->", renderMaterial(data.material));
}

export async function fetchPlantilla(): Promise<string> {
  const res = await fetch("/plantilla-cuestionario.html");
  if (!res.ok) throw new Error("No se pudo cargar la plantilla del cuestionario");
  return res.text();
}
