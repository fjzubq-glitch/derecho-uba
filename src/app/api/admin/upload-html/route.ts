import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";
import { uploadToR2 } from "@/lib/r2";

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { archivo_id, html } = body;

    if (!archivo_id || !html) {
      return NextResponse.json({ error: "Falta archivo_id o html" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: archivo } = await supabase
      .from("archivos")
      .select("storage_key")
      .eq("id", archivo_id)
      .single();

    if (!archivo) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    const key = archivo.storage_key || `uploads/original-${Date.now()}.html`;
    await uploadToR2(key, Buffer.from(html, "utf-8"), "text/html; charset=utf-8");

    if (!archivo.storage_key) {
      await supabase.from("archivos").update({ storage_key: key }).eq("id", archivo_id);
    }

    return NextResponse.json({ ok: true, storage_key: key, size: html.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
