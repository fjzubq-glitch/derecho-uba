import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { uploadToR2 } from "@/lib/r2";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const debug: Record<string, any> = {};
    const keys: string[] = [];
    formData.forEach((_, key) => keys.push(key));
    debug.keys = keys;

    const materiaId = formData.get("materiaId") as string;
    const claseNumero = Number(formData.get("claseNumero"));
    const claseTitulo = formData.get("claseTitulo") as string;
    const claseFecha = formData.get("claseFecha") as string;
    const itemsJson = formData.get("items") as string;

    debug.materiaId = materiaId;
    debug.claseNumero = claseNumero;
    debug.claseTitulo = claseTitulo;
    debug.claseFecha = claseFecha;
    debug.itemsJson = itemsJson;

    if (!materiaId || !claseTitulo) {
      return NextResponse.json({ ok: false, error: "Missing required fields", debug });
    }

    let items: any[];
    try {
      items = JSON.parse(itemsJson);
      debug.items = items;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid items JSON", debug });
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
        return NextResponse.json({ ok: false, error: "Failed to update class: " + updErr.message, debug });
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
        return NextResponse.json({ ok: false, error: "Failed to create class: " + (claseError?.message || "no data"), debug });
      }
      claseId = newClase.id;
    }

    debug.claseId = claseId;
    const insertErrors: string[] = [];

    for (const item of items) {
      let storageKey = item.storageKey || null;

      if (storageKey) {
        const fileKey = `file_${item.tipo}`;
        const file = formData.get(fileKey);
        debug[`file_${item.tipo}`] = file ? `File: ${(file as File).name} (${(file as File).size} bytes, ${(file as File).type})` : "null";

        if (file) {
          const buffer = Buffer.from(await (file as File).arrayBuffer());
          const contentType = (file as File).type || "audio/mpeg";
          try {
            await uploadToR2(storageKey, buffer, contentType);
          } catch (r2Err: any) {
            const msg = `R2 upload failed for ${storageKey}: ${r2Err?.message || r2Err}`;
            console.error(msg);
            insertErrors.push(msg);
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
        const msg = `Insert error for ${item.nombre}: ${insertError.message}`;
        console.error(msg);
        insertErrors.push(msg);
      }
    }

    if (insertErrors.length > 0) {
      return NextResponse.json({ ok: false, error: insertErrors.join("; "), debug });
    }

    return NextResponse.json({ ok: true, claseId, debug });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ ok: false, error: "Server error: " + (error?.message || String(error)) });
  }
}
