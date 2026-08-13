import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";
import { validateAudioFile, validateDocumentFile } from "@/lib/fileValidation";

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { materiaId, claseNumero, claseTitulo, claseFecha, items, claseId } = body;

    if ((!materiaId || !claseTitulo || !items) && !claseId) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    let targetClaseId: string;

    if (claseId) {
      const { data: claseExistente } = await getSupabaseAdmin()
        .from("clases")
        .select("id")
        .eq("id", claseId)
        .single();

      if (!claseExistente) {
        return NextResponse.json({ ok: false, error: "Clase no encontrada" }, { status: 404 });
      }
      targetClaseId = claseId;
    } else {
      const { data: existingClase } = await getSupabaseAdmin()
        .from("clases")
        .select("id")
        .eq("materia_id", materiaId)
        .eq("numero", claseNumero)
        .single();

      if (existingClase) {
        targetClaseId = existingClase.id;
        const { error: updErr } = await getSupabaseAdmin()
          .from("clases")
          .update({ titulo: claseTitulo, fecha: claseFecha || null })
          .eq("id", targetClaseId);
        if (updErr) {
          return NextResponse.json({ ok: false, error: "Failed to update class: " + updErr.message }, { status: 500 });
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
          return NextResponse.json({ ok: false, error: "Failed to create class: " + (claseError?.message || "no data") }, { status: 500 });
        }
        targetClaseId = newClase.id;
      }
    }

    const insertErrors: string[] = [];

    const { data: existingFiles } = await getSupabaseAdmin()
      .from("archivos")
      .select("orden")
      .eq("clase_id", targetClaseId)
      .order("orden", { ascending: false })
      .limit(1);

    let nextOrden = (existingFiles?.[0]?.orden ?? -1) + 1;

    for (const item of items) {
      if (item.storageKey) {
        const fileName = String(item.storageKey).split("/").pop() || "";
        const isAudio = item.tipo === "audio_clase" || item.tipo === "podcast";
        const validation = isAudio
          ? validateAudioFile({ name: fileName, size: Number(item.fileSize) || 0, type: item.tipo === "audio_clase" || item.tipo === "podcast" ? "audio/mpeg" : undefined })
          : validateDocumentFile({ name: fileName, size: Number(item.fileSize) || 0 });
        if (!validation.ok) {
          insertErrors.push(validation.error || "Archivo inválido");
          continue;
        }
      }

      const { error: insertError } = await getSupabaseAdmin().from("archivos").insert({
        clase_id: targetClaseId,
        tipo: item.tipo,
        nombre_display: item.nombre,
        storage_key: item.storageKey || null,
        youtube_url: item.youtubeUrl || null,
        cloudinary_url: item.cloudinaryUrl || null,
        contenido_texto: item.contenidoTexto || null,
        file_size: item.fileSize || null,
        duration_seconds: item.durationSeconds || null,
        orden: nextOrden++,
      });

      if (insertError) {
        const msg = `Insert error for ${item.nombre}: ${insertError.message}`;
        console.error(msg);
        insertErrors.push(msg);
      }
    }

    if (insertErrors.length > 0) {
      return NextResponse.json({ ok: false, error: insertErrors.join("; ") }, { status: 500 });
    }

    return NextResponse.json({ ok: true, claseId: targetClaseId });
  } catch (error: unknown) {
    console.error("Upload error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: "Server error: " + msg }, { status: 500 });
  }
}
