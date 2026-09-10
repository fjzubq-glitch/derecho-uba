import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isRateLimited } from "@/lib/simpleRateLimit";

const RATE_KEY = "leyes-search";
const RATE_MAX = 20;
const RATE_WINDOW_MS = 60 * 1000;

const INFOLEG_BASE = "https://servicios.infoleg.gob.ar/infolegInternet";
const PAGE_SIZE = 20;

/** Tipos importados del dataset abierto a Supabase. */
const TIPOS_SUPABASE = new Set(["Ley", "Decreto", "Decreto/Ley", "Acordada"]);

const ORDEN_TIPOS: Record<string, number> = {
  Ley: 0,
  "Decreto/Ley": 1,
  Decreto: 2,
  Acordada: 3,
  "Decisión Administrativa": 4,
  Resolución: 5,
  Disposición: 6,
  Ordenanza: 7,
};

const TIPO_A_CODIGO_INFOLEG: Record<string, string> = {
  Ley: "1",
  Decreto: "2",
  "Decisión Administrativa": "8",
  Resolución: "3",
  Disposición: "4",
  Acordada: "12",
  Ordenanza: "28",
};

interface LeyResultado {
  id: string;
  tipo: string;
  numero: string;
  anio: string;
  dependencia: string;
  fecha: string;
  descripcion: string;
  resumen: string;
  url: string;
  score?: number;
  consolidatedUrl?: string | null;
  textoUrl?: string | null;
  label?: string;
}

interface SupabaseRow {
  id_norma: string;
  tipo_norma: string;
  numero_norma: string | null;
  clase_norma: string | null;
  organismo_origen: string | null;
  fecha_sancion: string | null;
  titulo_resumido: string | null;
  titulo_sumario: string | null;
  texto_resumido: string | null;
  texto_original: string | null;
  texto_actualizado: string | null;
  modificada_por: number | null;
  modifica_a: number | null;
  rank: number | null;
}

function decodeBuffer(buf: ArrayBuffer): string {
  const decoder = new TextDecoder("iso-8859-1");
  return decoder.decode(buf);
}

/** Detectar patrones tipo "ley 26994", "ley 19.550" o "decreto 123/2020" en el query */
function parseQuery(q: string): { tipoDetectado: string; numeroDetectado: string; textoLimpio: string } {
  const match = q.match(/^(ley|decreto|resolución|resolucion|disposición|disposicion|acordada|ordenanza)\s+(?:n[°º]?\s*)?(\d[\d.]*)/i);
  if (match) {
    const tipo = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
    const numero = match[2].replace(/\./g, "");
    return { tipoDetectado: tipo, numeroDetectado: numero, textoLimpio: "" };
  }
  const tipoMatch = q.match(/^(ley|decreto|resolución|resolucion|disposición|disposicion)\s+(?:general\s+)?de\s+/i);
  if (tipoMatch) {
    const tipo = tipoMatch[1].charAt(0).toUpperCase() + tipoMatch[1].slice(1).toLowerCase();
    const textoLimpio = q.replace(/^(ley|decreto|resolución|resolucion|disposición|disposicion)\s+(?:general\s+)?de\s+/i, "").trim();
    return { tipoDetectado: tipo, numeroDetectado: "", textoLimpio };
  }
  return { tipoDetectado: "", numeroDetectado: "", textoLimpio: q };
}

function mapSupabaseRow(r: SupabaseRow): LeyResultado {
  const anio = r.fecha_sancion ? String(r.fecha_sancion).slice(0, 4) : "";
  const texto = r.texto_actualizado || r.texto_original || "";
  return {
    id: r.id_norma,
    tipo: r.tipo_norma,
    numero: r.numero_norma || "",
    anio,
    dependencia: r.organismo_origen || "",
    fecha: r.fecha_sancion || "",
    descripcion: r.titulo_resumido || r.titulo_sumario || "",
    resumen: r.texto_resumido || "",
    url: `${INFOLEG_BASE}/verNorma.do?id=${r.id_norma}`,
    textoUrl: texto || null,
    score: r.rank ?? 0,
  };
}

const MOD_PAT = /MODIFICACION|MODIFICA|ABROGA|DEROGA|SUSTITU|ADECUACION|INCORPORA|PROMULGACION|REFORMA/;

/** Normaliza un título: mayúsculas, sin acentos, espacios colapsados. */
function normTit(s: string | null | undefined): string {
  return (s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Score de relevancia: premia coincidencia de título/sumario, leyes base
 * (modificadas muchas veces) y tipo Ley; penaliza modificatorias.
 */
function scoreLey(r: SupabaseRow, qn: string): number {
  if (!qn) return 0;
  const resumen = normTit(r.titulo_resumido);
  const sumario = normTit(r.titulo_sumario);
  const rank = Math.min(Math.max(r.rank || 0, 0), 1);

  let s = rank * 10;
  if (sumario === qn) s += 400;
  if (resumen === qn) s += 300;
  if (sumario.startsWith(qn)) s += 100;
  if (resumen.startsWith(qn)) s += 80;
  if (sumario.includes(qn)) s += 30;

  s += Math.min(r.modificada_por || 0, 50) * 12;

  if (r.tipo_norma === "Ley") s += 150;
  else if (r.tipo_norma === "Decreto/Ley") s += 120;
  else if (r.tipo_norma === "Decreto") s += 10;

  if (MOD_PAT.test(resumen) && !MOD_PAT.test(qn)) s -= 200;
  if (MOD_PAT.test(sumario) && !MOD_PAT.test(qn)) s -= 100;

  return s;
}

/** Buscar en Supabase (dataset InfoLeg). Devuelve null si falla. */
async function buscarEnSupabase(
  q: string,
  tipo: string,
  numero: string,
  anio: string,
  page: number,
): Promise<{ resultados: LeyResultado[]; total: number; paginas: number } | null> {
  try {
    const supabase = getSupabaseAdmin();

    // Traemos hasta 300 candidatos y re-ordenamos por relevancia en memoria.
    // (La función SQL devuelve por ts_rank, que satura y deja ganar a modificatorias.)
    const { data, error } = await supabase.rpc("buscar_leyes_infoleg", {
      q,
      tipo_filtro: tipo,
      numero_filtro: numero,
      anio_filtro: anio,
      limite: 300,
      desplazamiento: 0,
    });
    if (error) return null;

    const rows = (data || []) as SupabaseRow[];

    // Asegurar que las leyes base (coincidencia directa de título) estén incluidas
    const qTrim = q.trim();
    if (qTrim) {
      const like = `%${qTrim}%`;
      const [{ data: bySum }, { data: byRes }] = await Promise.all([
        supabase.from("leyes_infoleg").select("*").ilike("titulo_sumario", like).limit(40),
        supabase.from("leyes_infoleg").select("*").ilike("titulo_resumido", like).limit(40),
      ]);
      const ids = new Set(rows.map((r) => r.id_norma));
      for (const r of [...(bySum || []), ...(byRes || [])] as SupabaseRow[]) {
        if (!ids.has(r.id_norma)) {
          ids.add(r.id_norma);
          rows.push(r);
        }
      }
    }

    const qn = normTit(q);
    const ranked = rows
      .map((r) => ({ r, s: scoreLey(r, qn) }))
      .sort((a, b) => b.s - a.s)
      .map((x) => x.r);

    const offset = (page - 1) * PAGE_SIZE;
    const pageRows = ranked.slice(offset, offset + PAGE_SIZE).map(mapSupabaseRow);
    const total = ranked.length;

    return {
      resultados: pageRows,
      total,
      paginas: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    };
  } catch {
    return null;
  }
}

/** Buscar el link "Texto actualizado" (taxact.htm) o "Texto completo" (norma.htm) desde InfoLeg */
async function fetchConsolidatedUrl(idInfoleg: string): Promise<string | null> {
  try {
    const res = await fetch(`${INFOLEG_BASE}/verNorma.do?id=${idInfoleg}`, {
      headers: { "User-Agent": "DerechoUBA-LawSearch/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const html = decodeBuffer(buf);
    const match = html.match(/<a\s+href='(anexos\/[^']*taxact\.htm)'/)
      || html.match(/<a\s+href='(anexos\/[^']*norma\.htm)'/);
    return match ? `${INFOLEG_BASE}/${match[1]}` : null;
  } catch {
    return null;
  }
}

function calcularScore(resumen: string, palabras: string[], queryCompleto: string): number {
  if (!resumen || palabras.length === 0) return 0;
  const resumenLower = resumen.toLowerCase();
  let hits = 0;
  for (const p of palabras) {
    if (resumenLower.includes(p)) hits++;
  }
  const scoreBase = (hits / palabras.length) * 10;
  const fraseBonus = resumenLower.includes(queryCompleto) ? 15 : 0;
  const majorityBonus = hits / palabras.length >= 0.7 ? 8 : 0;
  return scoreBase + fraseBonus + majorityBonus;
}

function parseResultados(html: string): { resultados: LeyResultado[]; total: number; paginas: number } {
  const resultados: LeyResultado[] = [];

  const totalMatch = html.match(/Cantidad de Normas Encontradas:\s*(\d+)/);
  const total = totalMatch ? parseInt(totalMatch[1], 10) : 0;

  const paginasMatch = html.match(/en\s*(\d+)\s*p&aacute;ginas/);
  const paginas = paginasMatch ? parseInt(paginasMatch[1], 10) : 1;

  const rows = html.split(/<tr>/);

  for (const row of rows) {
    if (!row.includes('class="vr_azul11"') || !row.includes("verNorma.do")) continue;

    const idMatch = row.match(/verNorma\.do[^"]*\?id=(\d+)/);
    if (!idMatch) continue;
    const id = idMatch[1];

    const aTagMatch = row.match(/class="vr_azul11">\s*(?:<br\/?>)?\s*<a[^>]*>([\s\S]*?)<\/a>/);
    if (!aTagMatch) continue;

    const tipoCompleto = aTagMatch[1].replace(/[\s\t\n\r]+/g, " ").trim();
    const tipoParsed = tipoCompleto.match(/^(.*?)\s+(\d+(?:\s*(?:GENERAL|DNU|Reglamentario))?)\s*\/\s*(\d{4})$/i)
      || tipoCompleto.match(/^(.*?)\s+(\d+)$/i);
    let tipo = "";
    let numero = "";
    let anio = "";
    if (tipoParsed) {
      tipo = tipoParsed[1].trim();
      numero = tipoParsed[2];
      anio = tipoParsed[3] || "";
    } else {
      tipo = tipoCompleto;
    }

    const depMatch = row.match(/<\/a><br\/?>\s*([\s\S]*?)<br\/?>/);
    const dependencia = depMatch ? depMatch[1].replace(/<[^>]*>/g, "").replace(/[\s\t\n\r]+/g, " ").trim() : "";

    const fechaMatch = row.match(/<td[^>]*align="center">\s*(?:<[^>]*>)*\s*(\d{2}-\w{3}-\d{4})/);
    const fecha = fechaMatch ? fechaMatch[1] : "";

    const descTdMatch = row.match(/<td valign="top">\s*<b>([\s\S]*?)<\/b>\s*([\s\S]*?)(?:<span class="vr_marron10"><i>([\s\S]*?)<\/i><\/span>)?\s*<\/td>/);
    let descripcion = "";
    let resumen = "";
    if (descTdMatch) {
      descripcion = descTdMatch[1].replace(/<[^>]*>/g, "").replace(/[\s\t\n\r]+/g, " ").trim();
      if (descTdMatch[2]) {
        const extra = descTdMatch[2].replace(/<[^>]*>/g, "").replace(/[\s\t\n\r]+/g, " ").trim();
        if (extra) descripcion = extra;
      }
      resumen = descTdMatch[3] ? descTdMatch[3].replace(/<[^>]*>/g, "").replace(/[\s\t\n\r]+/g, " ").trim() : "";
    }

    resultados.push({
      id,
      tipo,
      numero,
      anio,
      dependencia,
      fecha,
      descripcion,
      resumen,
      url: `${INFOLEG_BASE}/verNorma.do?id=${id}`,
    });
  }

  return { resultados, total, paginas };
}

function sortResultados(resultados: LeyResultado[], palabrasQuery: string[], queryCompleto: string): LeyResultado[] {
  for (const r of resultados) {
    r.score = calcularScore(r.resumen, palabrasQuery, queryCompleto) * 1
      + calcularScore(r.descripcion, palabrasQuery, queryCompleto) * 0.5;
    if (r.numero && palabrasQuery.includes(r.numero)) {
      r.score += 20;
    }
  }

  resultados.sort((a, b) => {
    const scoreDiff = (b.score || 0) - (a.score || 0);
    if (scoreDiff !== 0) return scoreDiff;
    const orderA = ORDEN_TIPOS[a.tipo] ?? 99;
    const orderB = ORDEN_TIPOS[b.tipo] ?? 99;
    return orderA - orderB;
  });

  return resultados;
}

async function fetchInfoLeg(q: string, tipoCodigo: string, numero: string, anio: string, page: number): Promise<{ resultados: LeyResultado[]; total: number; paginas: number }> {
  const formData = new URLSearchParams();
  formData.append("texto", q);
  formData.append("tipoNorma", tipoCodigo);
  formData.append("numero", numero);
  formData.append("anioSancion", anio);
  formData.append("anioPubDesde", "");
  formData.append("anioPubHasta", "");
  formData.append("dependencia", "");
  formData.append("diaPubDesde", "");
  formData.append("diaPubHasta", "");
  formData.append("mesPubDesde", "0");
  formData.append("mesPubHasta", "0");

  const searchUrl = page > 1
    ? `${INFOLEG_BASE}/buscarNormas.do?desplazamiento=${(page - 1) * 20}`
    : `${INFOLEG_BASE}/buscarNormas.do`;

  const res = await fetch(searchUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "DerechoUBA-LawSearch/1.0",
    },
    body: formData.toString(),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error("InfoLeg fetch failed");

  const buf = await res.arrayBuffer();
  const html = decodeBuffer(buf);
  return parseResultados(html);
}

/** Fallback: scraping de InfoLeg cuando Supabase no tiene resultados. */
async function buscarEnInfoLeg(
  textoBusqueda: string,
  tipoDetectado: string,
  numeroDetectado: string,
  anio: string,
  page: number,
): Promise<{ resultados: LeyResultado[]; total: number; paginas: number }> {
  const tipoCodigo = TIPO_A_CODIGO_INFOLEG[tipoDetectado] || "";
  const palabrasQuery = textoBusqueda.toLowerCase().split(/\s+/).filter(w => w.length > 2 && w !== "para" && w !== "por" && w !== "con" && w !== "una" && w !== "uno" && w !== "las" && w !== "los");

  let result: { resultados: LeyResultado[]; total: number; paginas: number };

  if (tipoDetectado && numeroDetectado) {
    const tipoCod = TIPO_A_CODIGO_INFOLEG[tipoDetectado] || "";
    result = await fetchInfoLeg("", tipoCod, numeroDetectado, "", 1);
  } else if (tipoCodigo || page > 1) {
    result = await fetchInfoLeg(textoBusqueda, tipoCodigo, numeroDetectado, anio, page);
    result.resultados = sortResultados(result.resultados, palabrasQuery, textoBusqueda.toLowerCase());
  } else {
    const [allParsed, leyesParsed] = await Promise.all([
      fetchInfoLeg(textoBusqueda, "", numeroDetectado, anio, 1),
      fetchInfoLeg(textoBusqueda, "1", numeroDetectado, anio, 1),
    ]);

    const seenIds = new Set<string>();
    const merged: LeyResultado[] = [];

    for (const r of leyesParsed.resultados) {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id);
        merged.push(r);
      }
    }
    for (const r of allParsed.resultados) {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id);
        merged.push(r);
      }
    }

    result = {
      resultados: sortResultados(merged, palabrasQuery, textoBusqueda.toLowerCase()),
      total: allParsed.total,
      paginas: allParsed.paginas,
    };
  }

  return result;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const tipo = url.searchParams.get("tipo")?.trim() || "";
  const numero = url.searchParams.get("numero")?.trim() || "";
  const anio = url.searchParams.get("anio")?.trim() || "";
  const page = parseInt(url.searchParams.get("page") || "1", 10);

  if (!q && !tipo && !numero) {
    return NextResponse.json({ resultados: [], total: 0, paginas: 0, page: 1 });
  }

  if (isRateLimited(`${RATE_KEY}:${page}`, RATE_MAX, RATE_WINDOW_MS)) {
    return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
  }

  try {
    const parsed = parseQuery(q);
    const tipoDetectado = parsed.tipoDetectado || tipo;
    const numeroDetectado = parsed.numeroDetectado || numero;
    const textoBusqueda = parsed.textoLimpio || q;

    // 1) Supabase (dataset InfoLeg). Solo si el tipo es de los importados o no hay filtro.
    const tipoApto = !tipoDetectado || TIPOS_SUPABASE.has(tipoDetectado);
    let resultado: { resultados: LeyResultado[]; total: number; paginas: number } | null = null;

    if (tipoApto) {
      resultado = await buscarEnSupabase(textoBusqueda, tipoDetectado, numeroDetectado, anio, page);
      if (resultado && resultado.resultados.length === 0) resultado = null;
    }

    // 2) Fallback: InfoLeg scraping
    if (!resultado) {
      resultado = await buscarEnInfoLeg(textoBusqueda, tipoDetectado, numeroDetectado, anio, page);
    }

    // Para page 1: destacar el primer resultado con link al texto (consolidado)
    if (page === 1 && resultado.resultados.length > 0) {
      const primero = resultado.resultados[0];
      let texto = primero.textoUrl || null;
      if (!texto) {
        texto = await fetchConsolidatedUrl(primero.id);
      }
      if (texto) {
        primero.consolidatedUrl = texto;
        primero.textoUrl = texto;
        primero.label = "Texto actualizado de la norma";
      }
    }

    return NextResponse.json({ ...resultado, page });
  } catch (err) {
    console.error("Error searching leyes:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
