import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getSignedAudioUrl, getAudioPublicUrl } from "@/lib/r2";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ archivoId: string }> }
) {
  const { archivoId } = await params;

  const { data: archivo, error } = await getSupabaseAdmin()
    .from("archivos")
    .select("storage_key, youtube_url, tipo")
    .eq("id", archivoId)
    .single();

  if (error || !archivo) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (archivo.youtube_url) {
    return NextResponse.json({ url: archivo.youtube_url });
  }

  if (!archivo.storage_key) {
    return NextResponse.json({ error: "No storage key" }, { status: 404 });
  }

  try {
    const url = await getSignedAudioUrl(archivo.storage_key);
    return NextResponse.json({ url });
  } catch {
    const url = getAudioPublicUrl(archivo.storage_key);
    return NextResponse.json({ url });
  }
}
