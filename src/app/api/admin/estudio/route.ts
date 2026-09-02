import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth";
import { obtenerColaHoy, marcarHecha, sincronizarRevisiones } from "@/lib/estudio";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    await sincronizarRevisiones();
    const { revisiones } = await obtenerColaHoy();
    return NextResponse.json({ ok: true, revisiones, hoy: new Date().toISOString() });
  } catch (e) {
    console.error("Estudio GET error:", e);
    return NextResponse.json({ ok: false, error: "Error al leer estudio" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json({ ok: false, error: "Falta id" }, { status: 400 });
    }
    const res = await marcarHecha(id);
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: "No se pudo marcar" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Estudio POST error:", e);
    return NextResponse.json({ ok: false, error: "Error al marcar" }, { status: 500 });
  }
}
