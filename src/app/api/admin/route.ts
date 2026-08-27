import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { uploadToR2, deleteFromR2 } from "@/lib/r2";
import { isAdminRequest } from "@/lib/auth";
import { validateAudioFile, validateDocumentFile } from "@/lib/fileValidation";

export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { tipo, id, data } = body;

    if (!tipo || !id) {
      return NextResponse.json({ error: "tipo and id required" }, { status: 400 });
    }

    if (tipo === "clase") {
      const updateData: Record<string, string | number> = {
        titulo: data.titulo,
        fecha: data.fecha || null,
        numero: data.numero,
      };
      if (data.tema !== undefined) updateData.tema = data.tema;

      const { error } = await getSupabaseAdmin()
        .from("clases")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    }

    if (tipo !== "clase") {
      const updateData: Record<string, string> = { nombre_display: data.nombre_display };
      if (data.nota !== undefined) updateData.nota = data.nota;
      if (data.youtube_url !== undefined) updateData.youtube_url = data.youtube_url;

      const { error } = await getSupabaseAdmin()
        .from("archivos")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    }

    if (tipo === "archivo_nota") {
      const { error } = await getSupabaseAdmin()
        .from("archivos")
        .update({ nota: data.nota || null })
        .eq("id", id);

      if (error) throw error;
    }

    if (tipo === "archivo_link") {
      const updateData: Record<string, string> = { nombre_display: data.nombre_display };
      if (data.youtube_url !== undefined) updateData.youtube_url = data.youtube_url;
      if (data.cloudinary_url !== undefined) updateData.cloudinary_url = data.cloudinary_url;

      const { error } = await getSupabaseAdmin()
        .from("archivos")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Edit error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const formData = await request.formData();
    const archivoId = formData.get("archivoId") as string;
    const file = formData.get("file") as File;

    if (!archivoId || !file) {
      return NextResponse.json({ error: "archivoId and file required" }, { status: 400 });
    }

    const { data: archivo } = await getSupabaseAdmin()
      .from("archivos")
      .select("storage_key, tipo")
      .eq("id", archivoId)
      .single();

    if (!archivo) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    const isAudio = archivo.tipo === "audio_clase" || archivo.tipo === "podcast";
    const validation = isAudio ? validateAudioFile(file) : validateDocumentFile(file);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    if (archivo.storage_key) {
      await deleteFromR2(archivo.storage_key);
    }

    const newKey = `uploads/${Date.now()}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadToR2(newKey, buffer, file.type);

    const { error } = await getSupabaseAdmin()
      .from("archivos")
      .update({
        storage_key: newKey,
        nombre_display: file.name.replace(/\.[^/.]+$/, ""),
        file_size: file.size,
      })
      .eq("id", archivoId);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Replace error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo");
    const id = searchParams.get("id");

    if (!tipo || !id) {
      return NextResponse.json({ error: "tipo and id required" }, { status: 400 });
    }

    if (tipo === "clase") {
      const { data: archivos } = await getSupabaseAdmin()
        .from("archivos")
        .select("storage_key")
        .eq("clase_id", id);

      if (archivos) {
        for (const arch of archivos) {
          if (arch.storage_key) {
            try { await deleteFromR2(arch.storage_key); } catch { /* best-effort */ }
          }
        }
      }

      await getSupabaseAdmin().from("archivos").delete().eq("clase_id", id);
      const { error } = await getSupabaseAdmin().from("clases").delete().eq("id", id);
      if (error) throw error;
    }

    if (tipo === "archivo" || tipo === "cuestionario") {
      const { data: archivo } = await getSupabaseAdmin()
        .from("archivos")
        .select("storage_key")
        .eq("id", id)
        .single();

      if (archivo?.storage_key) {
        try { await deleteFromR2(archivo.storage_key); } catch { /* best-effort */ }
      }

      const { error } = await getSupabaseAdmin().from("archivos").delete().eq("id", id);
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
