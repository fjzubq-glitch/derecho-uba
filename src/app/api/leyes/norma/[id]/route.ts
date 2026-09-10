import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/simpleRateLimit";

const RATE_KEY = "leyes-norma";
const RATE_MAX = 30;
const RATE_WINDOW_MS = 60 * 1000;

const INFOLEG_BASE = "https://servicios.infoleg.gob.ar/infolegInternet";

function decodeBuffer(buf: Buffer): string {
  const decoder = new TextDecoder("iso-8859-1");
  return decoder.decode(buf);
}

interface NormaDetalle {
  id: string;
  tipo: string;
  numero: string;
  anio: string;
  dependencia: string;
  fecha: string;
  titulo: string;
  resumen: string;
  textoOriginalUrl: string | null;
  textoActualizadoUrl: string | null;
  modificaciones: string;
  urlInfoleg: string;
}

function parseNorma(html: string, id: string): NormaDetalle {
  const tipoMatch = html.match(/<strong>\s*([\w\s]+?)&nbsp;\s*([\w\s]+?)&nbsp;\s*([\s\S]*?)\s*<\/strong>/);
  const tipo = tipoMatch ? tipoMatch[1].replace(/\s+/g, " ").trim() : "";
  const numeroRaw = tipoMatch ? tipoMatch[2].replace(/\s+/g, " ").trim() : "";
  const dependencia = tipoMatch ? tipoMatch[3].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() : "";

  const numeroMatch = numeroRaw.match(/^(\d+(?:\s*(?:GENERAL|DNU|Reglamentario))?)\s*\/\s*(\d{4})$/i);
  const numero = numeroMatch ? numeroMatch[1].trim() : numeroRaw;
  const anio = numeroMatch ? numeroMatch[2] : "";

  const fechaMatch = html.match(/<span class="vr_azul11">\s*(\d{2}-\w{3}-\d{4})\s*<\/span>/);
  const fecha = fechaMatch ? fechaMatch[1] : "";

  const tituloMatch = html.match(/<span class="destacado">\s*([\s\S]*?)\s*<\/span>/);
  const titulo = tituloMatch ? tituloMatch[1].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() : "";

  const resumenMatch = html.match(/<strong>\s*Resumen:\s*<\/strong>\s*<br\/?>\s*([\s\S]*?)\s*<\/p>/);
  const resumen = resumenMatch ? resumenMatch[1].replace(/<[^>]*>/g, "").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim() : "";

  const textoOriginalMatch = html.match(/<a href='(anexos\/[^']*norma\.htm)'/);
  const textoOriginalUrl = textoOriginalMatch ? `${INFOLEG_BASE}/${textoOriginalMatch[1]}` : null;

  const textoActualizadoMatch = html.match(/<a href='(anexos\/[^']*taxact\.htm)'/);
  const textoActualizadoUrl = textoActualizadoMatch ? `${INFOLEG_BASE}/${textoActualizadoMatch[1]}` : null;

  const modifMatch = html.match(/Esta norma (?:modifica|complementa).*?(\d+)\s*norma/);
  const modifPorMatch = html.match(/Esta norma es complementada.*?(\d+)\s*norma/);
  let modificaciones = "";
  if (modifMatch) modificaciones += `Modifica ${modifMatch[1]} norma(s). `;
  if (modifPorMatch) modificaciones += `Modificada por ${modifPorMatch[1]} norma(s).`;

  return {
    id,
    tipo,
    numero,
    anio,
    dependencia,
    fecha,
    titulo,
    resumen,
    textoOriginalUrl,
    textoActualizadoUrl,
    modificaciones: modificaciones.trim(),
    urlInfoleg: `${INFOLEG_BASE}/verNorma.do?id=${id}`,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid norm ID" }, { status: 400 });
  }

  if (isRateLimited(`${RATE_KEY}:${id}`, RATE_MAX, RATE_WINDOW_MS)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const res = await fetch(`${INFOLEG_BASE}/verNorma.do?id=${id}`, {
      headers: {
        "User-Agent": "DerechoUBA-LawSearch/1.0",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Norma not found" }, { status: 404 });
    }

    const buf = Buffer.from(await res.arrayBuffer());
    const html = decodeBuffer(buf);
    const norma = parseNorma(html, id);

    return NextResponse.json(norma);
  } catch (err) {
    console.error("Error fetching norma from InfoLeg:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
