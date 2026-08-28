import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getObjectStream } from "@/lib/r2";
import { ipFromRequest, isRateLimited } from "@/lib/simpleRateLimit";
import { isAdminRequest } from "@/lib/auth";

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

  // Los cuestionarios solo son accesibles para el administrador
  if (archivo.tipo === "cuestionario" && !isAdminRequest(request.headers.get("cookie"))) {
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

    // Los cuestionarios son HTML interactivos: forzar el content-type para
    // que el iframe los renderice aunque R2 los haya guardado con otro tipo
    if (archivo.tipo === "cuestionario") {
      headers["content-type"] = "text/html; charset=utf-8";
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
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(msg, { status: 500 });
  }
}

// Reporta la duración real del audio (metadatos del media element) para
// persistirla y mostrar duraciones correctas en las listas.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ archivoId: string }> }
) {
  try {
    if (!isAdminRequest(request.headers.get("cookie"))) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    if (isRateLimited(`stream-put:${ipFromRequest(request)}`, 300, 60 * 60 * 1000)) {
      return Response.json({ ok: false, error: "Too many requests" }, { status: 429 });
    }

    const { archivoId } = await params;
    const body = await request.json();
    const duration = Number(body.duration);

    if (!archivoId || !Number.isFinite(duration) || duration <= 0 || duration > 24 * 60 * 60) {
      return Response.json({ ok: false, error: "duration required" }, { status: 400 });
    }

    const { error } = await getSupabaseAdmin()
      .from("archivos")
      .update({ duration_seconds: Math.round(duration) })
      .eq("id", archivoId);

    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}
