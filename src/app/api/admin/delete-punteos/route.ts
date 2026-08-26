import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { deleteFromR2 } from "@/lib/r2";

export async function POST() {
  try {
    const supabase = getSupabaseAdmin();
    const { data: archivos, error } = await supabase
      .from("archivos")
      .select("id, storage_key, nombre_display")
      .eq("tipo", "punteo_clase");

    if (error) throw new Error(error.message);
    if (!archivos || archivos.length === 0) {
      return NextResponse.json({ ok: true, deleted: 0, message: "No hay punteos" });
    }

    let deleted = 0;
    const errors: string[] = [];

    for (const arch of archivos) {
      if (arch.storage_key) {
        try { await deleteFromR2(arch.storage_key); } catch { /* best-effort */ }
      }
      const { error: delErr } = await supabase.from("archivos").delete().eq("id", arch.id);
      if (delErr) {
        errors.push(`${arch.nombre_display}: ${delErr.message}`);
      } else {
        deleted++;
      }
    }

    return NextResponse.json({ ok: true, deleted, total: archivos.length, errors: errors.length > 0 ? errors : undefined });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
