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
    .select("storage_key, youtube_url, tipo, contenido_texto")
    .eq("id", archivoId)
    .single();

  if (error || !archivo) {
    return new Response("File not found", { status: 404 });
  }

  if (archivo.youtube_url) {
    return Response.json({ url: archivo.youtube_url });
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
    const r2Res = await getObjectStream(archivo.storage_key, range);

    const headers: Record<string, string> = {};
    for (const key of ["content-type", "content-length", "content-range", "accept-ranges", "etag"]) {
      const val = r2Res.headers.get(key);
      if (val) headers[key] = val;
    }

    return new Response(r2Res.body, {
      status: r2Res.status,
      headers,
    });
  } catch (e: any) {
    return new Response(e.message, { status: 500 });
  }
}
