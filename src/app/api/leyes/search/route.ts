import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/simpleRateLimit";

const RATE_KEY = "leyes-search";
const RATE_MAX = 20;
const RATE_WINDOW_MS = 60 * 1000;

const INFOLEG_BASE = "https://servicios.infoleg.gob.ar/infolegInternet";

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

  const rowRegex = /<tr>\s*<td valign="top" class="vr_azul11">\s*(?:<br\/?>)?\s*<a[^>]*href="[^"]*verNorma\.do[^"]*\?id=(\d+)"[^>]*>\s*([\s\S]*?)\s*<\/a>\s*<br\/?>\s*([\s\S]*?)\s*<br\/?>/g;

  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const id = match[1];
    const tipoRaw = match[2].replace(/\s+/g, " ").trim();
    const dependenciaRaw = match[3].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

    const tipoMatch = tipoRaw.match(/^([\w\s/]+?)(?:\s+(\d+(?:\s*(?:GENERAL|DNU|Reglamentario))?)\s*\/\s*(\d{4}))?$/i);
    let tipo = "";
    let numero = "";
    let anio = "";

    if (tipoMatch) {
      tipo = tipoMatch[1].trim();
      numero = tipoMatch[2] || "";
      anio = tipoMatch[3] || "";
    } else {
      const parts = tipoRaw.split(/\s+/);
      tipo = parts[0] || "";
      numero = parts.slice(1).join(" ");
    }

    const afterRow = html.substring(match.index + match[0].length, match.index + match[0].length + 1500);

    const fechaMatch = afterRow.match(/<a[^>]*>(\d{2}-\w{3}-\d{4})<\/a>/);
    const fecha = fechaMatch ? fechaMatch[1] : "";

    const descMatch = afterRow.match(/<td valign="top">\s*<b>[^<]*<\/b>\s*([^<]*(?:<br\/?>)?[^<]*)\s*(?:<span[^>]*><i>([^<]*)<\/i><\/span>)?/);
    let descripcion = "";
    let resumen = "";
    if (descMatch) {
      descripcion = descMatch[1].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
      resumen = descMatch[2] ? descMatch[2].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() : "";
    }

    resultados.push({
      id,
      tipo,
      numero,
      anio,
      dependencia: dependenciaRaw,
      fecha,
      descripcion,
      resumen,
      url: `${INFOLEG_BASE}/verNorma.do?id=${id}`,
    });
  }

  return { resultados, total, paginas };
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
    const formData = new URLSearchParams();
    formData.append("texto", q);
    formData.append("tipoNorma", tipo);
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

    if (!res.ok) {
      return NextResponse.json({ error: "Error fetching from InfoLeg" }, { status: 502 });
    }

    const buf = Buffer.from(await res.arrayBuffer());
    const html = decodeBuffer(buf);
    const parsed = parseResultados(html);

    return NextResponse.json({
      ...parsed,
      page,
    });
  } catch (err) {
    console.error("Error searching InfoLeg:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
