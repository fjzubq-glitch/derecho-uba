import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    const { storageKey, fileName, fileSize } = await request.json();
    if (!storageKey || !fileName) return NextResponse.json({ ok: false, error: "Faltan datos" }, { status: 400 });
    const supabase = getSupabaseAdmin();
    await supabase.from("personal_binaural").insert({ storage_key: storageKey, file_name: fileName, file_size: fileSize || null });
    const { data: olds } = await supabase.from("personal_binaural").select("id").order("created_at", { ascending: false });
    if (olds && olds.length > 1) {
      const toDel = olds.slice(1).map((o) => o.id);
      await supabase.from("personal_binaural").delete().in("id", toDel);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("binaural register", e);
    return NextResponse.json({ ok: false, error: "Error" }, { status: 500 });
  }
}
