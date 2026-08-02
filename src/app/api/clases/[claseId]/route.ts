import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ claseId: string }> }
) {
  const { claseId } = await params;
  const supabase = getSupabaseAdmin();

  const { data: clase } = await supabase
    .from("clases")
    .select(`
      id, numero, titulo, fecha,
      archivos (id, tipo, nombre_display, storage_key, youtube_url, contenido_texto, nota, duration_seconds, play_count)
    `)
    .eq("id", claseId)
    .single();

  return NextResponse.json({ clase: clase || null });
}
