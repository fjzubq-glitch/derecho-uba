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

const hasHtml = (s: string = "") => /<[a-z][\s\S]*>/i.test(s);

const renderNumberedItems = (s: string): string => {
  const re = /\((\d+|[a-z])\)\s*/g;
  const firstMatch = re.exec(s);
  if (!firstMatch) return "";
  const intro = s.slice(0, firstMatch.index).trim();
  const rest = s.slice(firstMatch.index);
  const items: string[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while ((m = re.exec(rest))) {
    if (m.index > last) items.push(rest.slice(last, m.index).trim());
    last = re.lastIndex;
  }
  if (last < rest.length) items.push(rest.slice(last).trim());
  if (items.length < 2) return "";
  const isAlpha = /[a-z]/.test(firstMatch[1]);
  const typeAttr = isAlpha ? ' type="a"' : "";
  const introHtml = intro ? `<p>${inline(intro)}</p>` : "";
  return `${introHtml}<ol${typeAttr}>${items.map((item) => `<li>${inline(item)}</li>`).join("")}</ol>`;
};

const paragraphs = (s: string = "") => {
  const listHtml = renderNumberedItems(s);
  if (listHtml) return listHtml;
  return s
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${inline(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
};

const badgeClass = (kind?: MaterialBadge["kind"]) => {
  switch (kind) {
    case "fuente": return "fuente";
    case "pareto": return "pareto";
    case "trampa": return "trampa";
    case "cae": return "cae";
    default: return "fuente";
  }
};

export function renderMaterial(material: MaterialSection[]): string {
  return material
    .map((m) => {
      const badges = (m.badges || [])
        .map((b) => `<span class="badge ${badgeClass(b.kind)}">${esc(b.text)}</span>`)
        .join("");
      const enun = m.enunciado ? `<p class="enunciado-q">${inline(m.enunciado)}</p>` : "";
      const ctx = m.contexto
        ? `<div class="contexto-caso">${inline(m.contexto)}</div>`
        : "";
      const tbl = m.table
        ? `<table><thead><tr>${m.table.headers
            .map((h) => `<th>${esc(h)}</th>`)
            .join("")}</tr></thead><tbody>${m.table.rows
            .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
            .join("")}</tbody></table>`
        : "";
      let resp = "";
      if (m.respuesta) {
        resp = `<details><summary>Ver resolución</summary><div class="detail-content">${m.table ? tbl : hasHtml(m.respuesta) ? m.respuesta : paragraphs(m.respuesta)}</div></details>`;
      } else if (m.table) {
        resp = tbl;
      }
      const err = m.errorTipico
        ? `<details class="error-detail"><summary>Ver error típico</summary><div class="detail-content"><b>❌ Error típico:</b> ${inline(m.errorTipico)}</div></details>`
        : "";
      const contra = m.contrafactual
        ? `<div class="contrafactico"><b>Sub-escenario contrafáctico:</b> ${inline(m.contrafactual)}</div>`
        : "";
      const link = m.linkRel
        ? `<p class="link-rel">🔗 ${esc(m.linkRel)}</p>`
        : "";
      return `<div class="mat-section" id="${esc(m.id)}">
        <div class="section-head"><h3>${esc(m.title)}</h3><div class="badges">${badges}</div></div>
        ${enun}${ctx}${resp}${err}${contra}${link}
      </div>`;
    })
    .join("\n");
}

export function renderToc(material: MaterialSection[]): string {
  const groups: Record<string, MaterialSection[]> = {};
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

function generarLogo(title: string): string {
  const m = title.match(/^([A-Za-zÀ-ÿ]+)\s*·\s*Clase\s+(\d+)/i);
  if (!m) return "C1";
  const initial = m[1].charAt(0).toUpperCase();
  return `${initial}${m[2]}`;
}

export function generarCuestionarioHTML(template: string, data: CuestionarioData): string {
  const key = data.storageKey || "quiz_progress";
  const total = data.questions.length;
  const casos = data.questions.filter((q) => /^(C|INT)/i.test(q.id)).length;
  return template
    .replace("__LOGO__", generarLogo(data.header.title))
    .replace("__TITLE__", esc(data.header.title))
    .replaceAll("__TITLE__", esc(data.header.title))
    .replace("__HEADER_SUB__", esc(data.header.sub))
    .replace("__HEADER_META__", esc(data.header.meta))
    .replace("__STORAGE_KEY__", key)
    .replace("__QUESTIONS__", JSON.stringify(data.questions, null, 2))
    .replace("__STAT_TOTAL__", String(total))
    .replace("__STAT_CASES__", String(casos))
    .replace("__MATERIAL_TITLE__", esc(data.header.sub))
    .replace("__TOC__", renderToc(data.material))
    .replace("__MATERIAL__", renderMaterial(data.material));
}

export async function fetchPlantilla(): Promise<string> {
  const res = await fetch("/plantilla-cuestionario.html");
  if (!res.ok) throw new Error("No se pudo cargar la plantilla del cuestionario");
  return res.text();
}
