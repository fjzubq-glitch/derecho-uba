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

const CODIGO_INFOLEG_A_TIPO: Record<string, string> = {
  "1": "Ley",
  "2": "Decreto",
  "8": "Decisión Administrativa",
  "3": "Resolución",
  "4": "Disposición",
  "12": "Acordada",
  "28": "Ordenanza",
};

/**
 * Mapping de códigos/leyes conocidas → ID de InfoLeg.
 * Cuando el usuario busca "codigo civil y comercial", buscamos directamente
 * el ID de InfoLeg y extraemos el link al texto completo/consolidado.
 */
const CODIGOS_CONOCIDOS: Record<string, { idInfoleg: string; numero: string; label: string }> = {
  "codigo civil y comercial": { idInfoleg: "235975", numero: "26994", label: "Código Civil y Comercial de la Nación" },
  "codigo civil": { idInfoleg: "235975", numero: "26994", label: "Código Civil y Comercial de la Nación" },
  "cod civil y comercial": { idInfoleg: "235975", numero: "26994", label: "Código Civil y Comercial de la Nación" },
  "codigo penal": { idInfoleg: "200848", numero: "11179", label: "Código Penal de la Nación" },
  "cod penal": { idInfoleg: "200848", numero: "11179", label: "Código Penal de la Nación" },
  "codigo procesal penal": { idInfoleg: "204826", numero: "27372", label: "Código Procesal Penal de la Nación" },
  "codigo procesal civil": { idInfoleg: "206039", numero: "17565", label: "Código Procesal Civil y Comercial de la Nación" },
  "codigo commercial": { idInfoleg: "235975", numero: "26994", label: "Código Civil y Comercial de la Nación" },
  "codigo de comercio": { idInfoleg: "235975", numero: "26994", label: "Código Civil y Comercial de la Nación" },
  "codigo de el trabajo": { idInfoleg: "197842", numero: "25323", label: "Código del Trabajo" },
  "codigo del trabajo": { idInfoleg: "197842", numero: "25323", label: "Código del Trabajo" },
  "codigo tributario": { idInfoleg: "197810", numero: "11683", label: "Código Tributario" },
  "codigo aduanero": { idInfoleg: "197785", numero: "22415", label: "Código Aduanero" },
  "codigo civil y comercial de la nacion": { idInfoleg: "235975", numero: "26994", label: "Código Civil y Comercial de la Nación" },
  "constitucion nacional": { idInfoleg: "56", numero: "24430", label: "Constitución de la Nación Argentina" },
  "constitucion de la nacion": { idInfoleg: "56", numero: "24430", label: "Constitución de la Nación Argentina" },
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

/** Detectar patrones tipo "ley 26994" o "decreto 123/2020" en el query */
function parseQuery(q: string): { tipoDetectado: string; numeroDetectado: string; textoLimpio: string } {
  const match = q.match(/^(ley|decreto|resolución|resolucion|disposición|disposicion|acordada|ordenanza)\s+(?:n[°º]?\s*)?(\d+)(?:\s*\/\s*\d{4})?$/i);
  if (match) {
    const tipo = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
    return { tipoDetectado: tipo, numeroDetectado: match[2], textoLimpio: "" };
  }
  return { tipoDetectado: "", numeroDetectado: "", textoLimpio: q };
}

/** Buscar el link "Texto completo" (norma.htm) desde la página de detalle de InfoLeg */
async function fetchConsolidatedUrl(idInfoleg: string): Promise<string | null> {
  try {
    const res = await fetch(`${INFOLEG_BASE}/verNorma.do?id=${idInfoleg}`, {
      headers: { "User-Agent": "DerechoUBA-LawSearch/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const html = decodeBuffer(buf);
    // Buscar link a norma.htm (texto completo consolidado)
    const match = html.match(/<a\s+href='(anexos\/[^']*norma\.htm)'/);
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
  const scoreBase = (hits / palabras.length) * 10;
  // Bonus: si el query completo aparece como frase en el resumen
  const fraseBonus = resumenLower.includes(queryCompleto) ? 15 : 0;
  return scoreBase + fraseBonus;
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
  // Calcular score por resumen
  for (const r of resultados) {
    r.score = calcularScore(r.resumen, palabrasQuery, queryCompleto) * 1
      + calcularScore(r.descripcion, palabrasQuery, queryCompleto) * 0.5;
    // Bonus: si el número de la norma coincide con alguna palabra numérica del query
    if (r.numero && palabrasQuery.includes(r.numero)) {
      r.score += 20;
    }
  }

  // Sort: mayor score primero, desempate por tipo (Ley primero)
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
    // Detectar si el query contiene "ley 26994" o similar
    const parsed = parseQuery(q);
    const tipoDetectado = parsed.tipoDetectado || tipo;
    const numeroDetectado = parsed.numeroDetectado || numero;
    const textoBusqueda = parsed.textoLimpio || q;

    const tipoCodigo = TIPO_A_CODIGO_INFOLEG[tipoDetectado] || "";
    const palabrasQuery = textoBusqueda.toLowerCase().split(/\s+/).filter(w => w.length > 2 && w !== "para" && w !== "por" && w !== "con" && w !== "una" && w !== "uno" && w !== "las" && w !== "los");

    // Si detectamos tipo+numbero, buscar directamente por número
    if (tipoDetectado && numeroDetectado) {
      const tipoCod = TIPO_A_CODIGO_INFOLEG[tipoDetectado] || "";
      const result = await fetchInfoLeg("", tipoCod, numeroDetectado, "", 1);
      // Buscar consolidated URL para el primer resultado
      if (result.resultados.length > 0) {
        const consolidatedUrl = await fetchConsolidatedUrl(result.resultados[0].id);
        if (consolidatedUrl) {
          result.resultados[0].consolidatedUrl = consolidatedUrl;
          result.resultados[0].label = "Texto completo de la norma";
        }
      }
      return NextResponse.json({ ...result, page: 1 });
    }

    // Detectar códigos conocidos (ej: "codigo civil y comercial")
    const queryNormalizado = textoBusqueda.toLowerCase().trim();
    const codigoConocido = CODIGOS_CONOCIDOS[queryNormalizado];

    if (codigoConocido) {
      // Fetch en paralelo: el código conocido + búsqueda normal
      const [consolidatedUrl, allParsed, leyesParsed] = await Promise.all([
        fetchConsolidatedUrl(codigoConocido.idInfoleg),
        fetchInfoLeg(textoBusqueda, "", numeroDetectado, anio, 1),
        fetchInfoLeg(textoBusqueda, "1", numeroDetectado, anio, 1),
      ]);

      // Crear resultado "destacado" con el texto consolidado
      const destacado: LeyResultado = {
        id: codigoConocido.idInfoleg,
        tipo: "Ley",
        numero: codigoConocido.numero,
        anio: "",
        dependencia: "HONORABLE CONGRESO DE LA NACION ARGENTINA",
        fecha: "",
        descripcion: codigoConocido.label,
        resumen: consolidatedUrl ? "Texto completo consolidado de la norma" : "",
        url: `${INFOLEG_BASE}/verNorma.do?id=${codigoConocido.idInfoleg}`,
        consolidatedUrl,
        label: "Texto completo de la norma",
        score: 1000,
      };

      // Merge + dedup (el destacado primero, luego el resto sin repetir)
      const merged: LeyResultado[] = [destacado];
      const seenIds = new Set<string>([codigoConocido.idInfoleg]);

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

      return NextResponse.json({
        resultados: merged,
        total: allParsed.total + 1,
        paginas: allParsed.paginas,
        page: 1,
      });
    }

    if (tipoCodigo || page > 1) {
      const result = await fetchInfoLeg(textoBusqueda, tipoCodigo, numeroDetectado, anio, page);
      result.resultados = sortResultados(result.resultados, palabrasQuery, textoBusqueda.toLowerCase());
      return NextResponse.json({ ...result, page });
    }

    // Page 1 sin filtro: requests en paralelo
    const [allParsed, leyesParsed] = await Promise.all([
      fetchInfoLeg(textoBusqueda, "", numeroDetectado, anio, 1),
      fetchInfoLeg(textoBusqueda, "1", numeroDetectado, anio, 1),
    ]);

    // Merge + dedup + sort por relevancia
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

    const sorted = sortResultados(merged, palabrasQuery, textoBusqueda.toLowerCase());

    return NextResponse.json({
      resultados: sorted,
      total: allParsed.total,
      paginas: allParsed.paginas,
      page: 1,
    });
  } catch (err) {
    console.error("Error searching InfoLeg:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
