import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { materiaId, claseNumero, claseTitulo, claseFecha, items } = body;

    if (!materiaId || !claseTitulo || !items) {
      return NextResponse.json({ ok: false, error: "Missing required fields" });
    }

    const { data: existingClase } = await getSupabaseAdmin()
      .from("clases")
      .select("id")
      .eq("materia_id", materiaId)
      .eq("numero", claseNumero)
      .single();

    let claseId: string;

    if (existingClase) {
      claseId = existingClase.id;
      const { error: updErr } = await getSupabaseAdmin()
        .from("clases")
        .update({ titulo: claseTitulo, fecha: claseFecha || null })
        .eq("id", claseId);
      if (updErr) {
        return NextResponse.json({ ok: false, error: "Failed to update class: " + updErr.message });
      }
    } else {
      const { data: newClase, error: claseError } = await getSupabaseAdmin()
        .from("clases")
        .insert({
          materia_id: materiaId,
          numero: claseNumero,
          titulo: claseTitulo,
          fecha: claseFecha || null,
        })
        .select("id")
        .single();

      if (claseError || !newClase) {
        return NextResponse.json({ ok: false, error: "Failed to create class: " + (claseError?.message || "no data") });
      }
      claseId = newClase.id;
    }

    const insertErrors: string[] = [];

    for (const item of items) {
      const { error: insertError } = await getSupabaseAdmin().from("archivos").insert({
        clase_id: claseId,
        tipo: item.tipo,
        nombre_display: item.nombre,
        storage_key: item.storageKey || null,
        youtube_url: item.youtubeUrl || null,
        contenido_texto: item.contenidoTexto || null,
        file_size: item.fileSize || null,
        duration_seconds: item.durationSeconds || null,
      });

      if (insertError) {
        const msg = `Insert error for ${item.nombre}: ${insertError.message}`;
        console.error(msg);
        insertErrors.push(msg);
      }
    }

    if (insertErrors.length > 0) {
      return NextResponse.json({ ok: false, error: insertErrors.join("; ") });
    }

    return NextResponse.json({ ok: true, claseId });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ ok: false, error: "Server error: " + (error?.message || String(error)) });
  }
}
