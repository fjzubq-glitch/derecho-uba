import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { uploadToR2 } from "@/lib/r2";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const materiaId = formData.get("materiaId") as string;
    const claseNumero = Number(formData.get("claseNumero"));
    const claseTitulo = formData.get("claseTitulo") as string;
    const claseFecha = formData.get("claseFecha") as string;
    const itemsJson = formData.get("items") as string;

    if (!materiaId || !claseTitulo) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
      await getSupabaseAdmin()
        .from("clases")
        .update({ titulo: claseTitulo, fecha: claseFecha || null })
        .eq("id", claseId);
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
        return NextResponse.json({ error: "Failed to create class" }, { status: 500 });
      }
      claseId = newClase.id;
    }

    const items = JSON.parse(itemsJson) as Array<{
      tipo: string;
      nombre: string;
      storageKey?: string;
      youtubeUrl?: string;
      contenidoTexto?: string;
      fileSize?: number;
      durationSeconds?: number;
    }>;

    for (const item of items) {
      let storageKey = item.storageKey || null;

      if (storageKey) {
        const fileKey = `file_${item.tipo}`;
        const file = formData.get(fileKey) as File | null;

        if (file) {
          const buffer = Buffer.from(await file.arrayBuffer());
          const contentType = file.type || "audio/mpeg";
          try {
            await uploadToR2(storageKey, buffer, contentType);
          } catch (r2Err) {
            console.error(`R2 upload failed for ${storageKey}:`, r2Err);
          }
        }
      }

      const { error: insertError } = await getSupabaseAdmin().from("archivos").insert({
        clase_id: claseId,
        tipo: item.tipo,
        nombre_display: item.nombre,
        storage_key: storageKey,
        youtube_url: item.youtubeUrl || null,
        contenido_texto: item.contenidoTexto || null,
        file_size: item.fileSize || null,
        duration_seconds: item.durationSeconds || null,
      });

      if (insertError) {
        console.error("Insert error:", insertError);
      }
    }

    return NextResponse.json({ ok: true, claseId });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
