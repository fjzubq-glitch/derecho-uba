import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/simpleRateLimit";

const RATE_KEY = "leyes-search";
const RATE_MAX = 20;
const RATE_WINDOW_MS = 60 * 1000;

const INFOLEG_BASE = "https://servicios.infoleg.gob.ar/infolegInternet";

const ORDEN_TIPOS: Record<string, number> = {
  Ley: 0,
  Decreto: 1,
  "Decisión Administrativa": 2,
  Resolución: 3,
  Disposición: 4,
  Acordada: 5,
  Ordenanza: 6,
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
  label?: string;
}

function decodeBuffer(buf: ArrayBuffer): string {
  const decoder = new TextDecoder("iso-8859-1");
  return decoder.decode(buf);
}

/** Detectar patrones tipo "ley 26994", "ley 19.550" o "decreto 123/2020" en el query */
function parseQuery(q: string): { tipoDetectado: string; numeroDetectado: string; textoLimpio: string } {
  // "ley 19550", "ley 19.550", "decreto 123/2020", "resolución 662"
  const match = q.match(/^(ley|decreto|resolución|resolucion|disposición|disposicion|acordada|ordenanza)\s+(?:n[°º]?\s*)?(\d[\d.]*)/i);
  if (match) {
    const tipo = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
    const numero = match[2].replace(/\./g, ""); // quitar puntos: "19.550" → "19550"
    return { tipoDetectado: tipo, numeroDetectado: numero, textoLimpio: "" };
  }
  // "ley de contrato de trabajo", "ley general de sociedades" → tipo detectado
  const tipoMatch = q.match(/^(ley|decreto|resolución|resolucion|disposición|disposicion)\s+(?:general\s+)?de\s+/i);
  if (tipoMatch) {
    const tipo = tipoMatch[1].charAt(0).toUpperCase() + tipoMatch[1].slice(1).toLowerCase();
    const textoLimpio = q.replace(/^(ley|decreto|resolución|resolucion|disposición|disposicion)\s+(?:general\s+)?de\s+/i, "").trim();
    return { tipoDetectado: tipo, numeroDetectado: "", textoLimpio };
  }
  return { tipoDetectado: "", numeroDetectado: "", textoLimpio: q };
}

/** Buscar el link "Texto actualizado" (taxact.htm) o "Texto completo" (norma.htm) desde la página de detalle de InfoLeg */
async function fetchConsolidatedUrl(idInfoleg: string): Promise<string | null> {
  try {
    const res = await fetch(`${INFOLEG_BASE}/verNorma.do?id=${idInfoleg}`, {
      headers: { "User-Agent": "DerechoUBA-LawSearch/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const html = decodeBuffer(buf);
    // Priorizar "texto actualizado" (consolidado), si no existe usar "texto completo"
    const match = html.match(/<a\s+href='(anexos\/[^']*taxact\.htm)'/)
      || html.match(/<a\s+href='(anexos\/[^']*norma\.htm)'/);
    return match ? `${INFOLEG_BASE}/${match[1]}` : null;
  } catch {
    return null;
  }
}

/** Calcular score de relevancia: cuántas palabras del query aparecen en el resumen */
function calcularScore(resumen: string, palabras: string[], queryCompleto: string): number {
  if (!resumen || palabras.length === 0) return 0;
  const resumenLower = resumen.toLowerCase();
  let hits = 0;
  for (const p of palabras) {
    if (resumenLower.includes(p)) hits++;
  }
  // Score base: proporción de palabras que coinciden
  const scoreBase = (hits / palabras.length) * 10;
  // Bonus: si el query completo aparece como frase en el resumen
  const fraseBonus = resumenLower.includes(queryCompleto) ? 15 : 0;
  // Bonus: si la mayoría de palabras coinciden (70%+), bonus extra
  const majorityBonus = (hits / palabras.length) >= 0.7 ? 8 : 0;
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

    const tipoCodigo = TIPO_A_CODIGO_INFOLEG[tipoDetectado] || "";
    const palabrasQuery = textoBusqueda.toLowerCase().split(/\s+/).filter(w => w.length > 2 && w !== "para" && w !== "por" && w !== "con" && w !== "una" && w !== "uno" && w !== "las" && w !== "los");

    let result: { resultados: LeyResultado[]; total: number; paginas: number };

    if (tipoDetectado && numeroDetectado) {
      // Búsqueda directa por tipo + número
      const tipoCod = TIPO_A_CODIGO_INFOLEG[tipoDetectado] || "";
      result = await fetchInfoLeg("", tipoCod, numeroDetectado, "", 1);
    } else if (tipoCodigo || page > 1) {
      result = await fetchInfoLeg(textoBusqueda, tipoCodigo, numeroDetectado, anio, page);
      result.resultados = sortResultados(result.resultados, palabrasQuery, textoBusqueda.toLowerCase());
    } else {
      // Page 1 sin filtro: requests en paralelo
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

    // Para page 1: fetch "texto actualizado" del primer resultado
    if (page === 1 && result.resultados.length > 0) {
      const consolidatedUrl = await fetchConsolidatedUrl(result.resultados[0].id);
      if (consolidatedUrl) {
        result.resultados[0].consolidatedUrl = consolidatedUrl;
        result.resultados[0].label = "Texto actualizado de la norma";
      }
    }

    return NextResponse.json({ ...result, page });
  } catch (err) {
    console.error("Error searching InfoLeg:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
