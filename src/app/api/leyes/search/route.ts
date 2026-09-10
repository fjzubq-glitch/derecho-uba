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
}

function decodeBuffer(buf: Buffer): string {
  const decoder = new TextDecoder("iso-8859-1");
  return decoder.decode(buf);
}

function parseResultados(html: string): { resultados: LeyResultado[]; total: number; paginas: number } {
  const resultados: LeyResultado[] = [];

  const totalMatch = html.match(/Cantidad de Normas Encontradas:\s*(\d+)/);
  const total = totalMatch ? parseInt(totalMatch[1], 10) : 0;

  const paginasMatch = html.match(/en\s*(\d+)\s*p&aacute;ginas/);
  const paginas = paginasMatch ? parseInt(paginasMatch[1], 10) : 1;

  // Split by <tr> tags to get individual rows
  const rows = html.split(/<tr>/);

  for (const row of rows) {
    // Must contain vr_azul11 (result row) and verNorma link
    if (!row.includes('class="vr_azul11"') || !row.includes("verNorma.do")) continue;

    // Extract ID
    const idMatch = row.match(/verNorma\.do[^"]*\?id=(\d+)/);
    if (!idMatch) continue;
    const id = idMatch[1];

    // Extract the <a> tag content (type + number + year)
    // The <a> tag contains the full text like "Resolución\n\t662\n\t/ 2026"
    const aTagMatch = row.match(/class="vr_azul11">\s*(?:<br\/?>)?\s*<a[^>]*>([\s\S]*?)<\/a>/);
    if (!aTagMatch) continue;

    // Clean the <a> tag content: collapse all whitespace
    const tipoCompleto = aTagMatch[1].replace(/[\s\t\n\r]+/g, " ").trim();
    // Parse formats:
    //   "Ley 27801" (sin año)
    //   "Resolución 662 / 2026" (con año)
    //   "Decreto DNU 585 / 2026" (subtipo + año)
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

    // Extract dependencia (text right after </a><br/>)
    const depMatch = row.match(/<\/a><br\/?>\s*([\s\S]*?)<br\/?>/);
    const dependencia = depMatch ? depMatch[1].replace(/<[^>]*>/g, "").replace(/[\s\t\n\r]+/g, " ").trim() : "";

    // Extract date from the second <td>
    const fechaMatch = row.match(/<td[^>]*align="center">\s*(?:<[^>]*>)*\s*(\d{2}-\w{3}-\d{4})/);
    const fecha = fechaMatch ? fechaMatch[1] : "";

    // Extract description and summary from the third <td>
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

  // Sort: Ley first, then Decreto, then others by original order
  resultados.sort((a, b) => {
    const orderA = ORDEN_TIPOS[a.tipo] ?? 99;
    const orderB = ORDEN_TIPOS[b.tipo] ?? 99;
    return orderA - orderB;
  });

  return { resultados, total, paginas };
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

  const buf = Buffer.from(await res.arrayBuffer());
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
    const tipoCodigo = TIPO_A_CODIGO_INFOLEG[tipo] || "";

    if (tipoCodigo || page > 1) {
      // Filtro explícito o paginación: un solo request
      const parsed = await fetchInfoLeg(q, tipoCodigo, numero, anio, page);
      return NextResponse.json({ ...parsed, page });
    }

    // Sin filtro de tipo, page 1: 2 requests en paralelo
    // 1) Todos los tipos (para total + paginas + otros tipos)
    // 2) Solo Leyes (para asegurar que aparezcan primero)
    const [allParsed, leyesParsed] = await Promise.all([
      fetchInfoLeg(q, "", numero, anio, 1),
      fetchInfoLeg(q, "1", numero, anio, 1),
    ]);

    // Merge: Leyes primero, luego el resto (deduplicados por ID)
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

    return NextResponse.json({
      resultados: merged,
      total: allParsed.total,
      paginas: allParsed.paginas,
      page: 1,
    });
  } catch (err) {
    console.error("Error searching InfoLeg:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
