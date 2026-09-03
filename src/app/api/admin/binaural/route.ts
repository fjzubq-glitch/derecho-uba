import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";
import { getObjectStream, uploadToR2 } from "@/lib/r2";
export const dynamic = "force-dynamic";

// GET /api/admin/binaural -> metadata
// GET /api/admin/binaural?stream=1 -> stream audio (solo admin)
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  const stream = request.nextUrl.searchParams.get("stream");
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("personal_binaural").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();

  if (stream === "1") {
    if (!data?.storage_key) return NextResponse.json({ ok: false, error: "No hay audio" }, { status: 404 });
    try {
      const range = request.headers.get("range") || undefined;
      const r2Res = await getObjectStream(data.storage_key, range);
      const headers: Record<string, string> = {
        "Content-Type": r2Res.headers.get("content-type") || "audio/mpeg",
        "Cache-Control": "private, max-age=3600",
        "Accept-Ranges": "bytes",
      };
      const cl = r2Res.headers.get("content-length");
      if (cl) headers["Content-Length"] = cl;
      const cr = r2Res.headers.get("content-range");
      if (cr) headers["Content-Range"] = cr;
      return new NextResponse(r2Res.body as unknown as BodyInit, {
        status: r2Res.status,
        headers,
      });
    } catch (e) {
      return NextResponse.json({ ok: false, error: "No se pudo leer audio" }, { status: 500 });
    }
  }

  if (!data) return NextResponse.json({ ok: true, binaural: null });
  return NextResponse.json({ ok: true, binaural: { file_name: data.file_name, storage_key: data.storage_key, created_at: data.created_at } });
}

// POST form-data file field "file"
export async function POST(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    const form = await request.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ ok: false, error: "Falta archivo" }, { status: 400 });
    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length > 80 * 1024 * 1024) return NextResponse.json({ ok: false, error: "Máx 80MB" }, { status: 400 });
    const ext = (file.name.split(".").pop() || "mp3").toLowerCase();
    const storageKey = `personal/binaural-${Date.now()}.${ext}`;
    const contentType = file.type || "audio/mpeg";
    await uploadToR2(storageKey, buf, contentType);
    const supabase = getSupabaseAdmin();
    await supabase.from("personal_binaural").insert({ storage_key: storageKey, file_name: file.name, file_size: buf.length });
    // limpiar viejos (mantener solo último)
    const { data: olds } = await supabase.from("personal_binaural").select("id").order("created_at", { ascending: false });
    if (olds && olds.length > 1) {
      const toDel = olds.slice(1).map((o) => o.id);
      await supabase.from("personal_binaural").delete().in("id", toDel);
    }
    return NextResponse.json({ ok: true, storage_key: storageKey });
  } catch (e) {
    console.error("binaural upload", e);
    return NextResponse.json({ ok: false, error: "Error al subir" }, { status: 500 });
  }
}
