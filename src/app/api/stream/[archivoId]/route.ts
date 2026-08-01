import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getObjectStream } from "@/lib/r2";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ archivoId: string }> }
) {
  const { archivoId } = await params;

  const { data: archivo, error } = await getSupabaseAdmin()
    .from("archivos")
    .select("storage_key, youtube_url, cloudinary_url, tipo, contenido_texto, nombre_display")
    .eq("id", archivoId)
    .single();

  if (error || !archivo) {
    return new Response("File not found", { status: 404 });
  }

  if (archivo.youtube_url) {
    return Response.json({ url: archivo.youtube_url });
  }

  if (archivo.cloudinary_url) {
    return Response.json({ url: archivo.cloudinary_url });
  }

  if (!archivo.storage_key) {
    if (archivo.contenido_texto) {
      return new Response(archivo.contenido_texto, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    return new Response("No content", { status: 404 });
  }

  try {
    const range = request.headers.get("range") || undefined;
    const isDownload = new URL(request.url).searchParams.get("download") === "1";
    const r2Res = await getObjectStream(archivo.storage_key, range);

    const headers: Record<string, string> = {};
    for (const key of ["content-type", "content-length", "content-range", "accept-ranges", "etag"]) {
      const val = r2Res.headers.get(key);
      if (val) headers[key] = val;
    }

    if (isDownload && !range) {
      const ext = (archivo.storage_key.split(".").pop() || "mp3").toLowerCase();
      const base = (archivo.nombre_display || "audio").replace(/[^\wÁÉÍÓÚáéíóúñÑ -]/g, "").trim() || "audio";
      headers["content-disposition"] = `attachment; filename="${encodeURIComponent(base)}.${ext}"`;
    }

    return new Response(r2Res.body, {
      status: r2Res.status,
      headers,
    });
  } catch (e: any) {
    return new Response(e.message, { status: 500 });
  }
}

// Reporta la duración real del audio (metadatos del media element) para
// persistirla y mostrar duraciones correctas en las listas.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ archivoId: string }> }
) {
  try {
    const { archivoId } = await params;
    const body = await request.json();
    const duration = Number(body.duration);

    if (!archivoId || !Number.isFinite(duration) || duration <= 0) {
      return Response.json({ ok: false, error: "duration required" }, { status: 400 });
    }

    const { error } = await getSupabaseAdmin()
      .from("archivos")
      .update({ duration_seconds: Math.round(duration) })
      .eq("id", archivoId);

    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
