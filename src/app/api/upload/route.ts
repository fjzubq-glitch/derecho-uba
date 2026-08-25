import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { uploadToR2 } from "@/lib/r2";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";
import { validateAudioFile, validateDocumentFile } from "@/lib/fileValidation";
import { CuestionarioData, generarCuestionarioHTML } from "@/lib/cuestionario";

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
      let storageKey = item.storageKey || null;
      let contenido: CuestionarioData | string | null = item.contenido || null;
      let fileSize = item.fileSize || null;

      if (item.tipo === "cuestionario" && contenido) {
        const parsed = typeof contenido === "string" ? JSON.parse(contenido) : contenido;
        if (!parsed || !Array.isArray(parsed.questions)) {
          insertErrors.push(`"${item.nombre}": contenido de cuestionario inválido (sin questions[])`);
          continue;
        }
        const plantillaPath = path.join(process.cwd(), "public", "plantilla-cuestionario.html");
        const plantilla = await fs.readFile(plantillaPath, "utf-8");
        const html = generarCuestionarioHTML(plantilla, parsed as CuestionarioData);
        storageKey = `uploads/${Date.now()}-cuestionario-${Date.now()}.html`;
        fileSize = Buffer.byteLength(html, "utf-8");
        try {
          await uploadToR2(storageKey, Buffer.from(html, "utf-8"), "text/html; charset=utf-8");
        } catch (e) {
          insertErrors.push(`"${item.nombre}": error al generar HTML — ${e instanceof Error ? e.message : String(e)}`);
          continue;
        }
        contenido = parsed;
      }

      if (storageKey) {
        const fileName = String(storageKey).split("/").pop() || "";
        const isAudio = item.tipo === "audio_clase" || item.tipo === "podcast";
        const validation = isAudio
          ? validateAudioFile({ name: fileName, size: Number(fileSize) || 0, type: item.tipo === "audio_clase" || item.tipo === "podcast" ? "audio/mpeg" : undefined })
          : validateDocumentFile({ name: fileName, size: Number(fileSize) || 0 });
        if (!validation.ok) {
          insertErrors.push(validation.error || "Archivo inválido");
          continue;
        }
      }

      const { error: insertError } = await getSupabaseAdmin().from("archivos").insert({
        clase_id: targetClaseId,
        tipo: item.tipo,
        nombre_display: item.nombre,
        storage_key: storageKey,
        youtube_url: item.youtubeUrl || null,
        cloudinary_url: item.cloudinaryUrl || null,
        contenido_texto: item.contenidoTexto || null,
        contenido,
        file_size: fileSize,
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
