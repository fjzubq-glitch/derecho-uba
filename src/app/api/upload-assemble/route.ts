import { NextRequest, NextResponse } from "next/server";
import { uploadToR2, deleteFromR2, getObjectBuffer } from "@/lib/r2";
import { isAdminRequest } from "@/lib/auth";
import { validateAudioFile, validateDocumentFile } from "@/lib/fileValidation";

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const { sessionId, totalParts, finalKey, contentType, fileType } = await request.json();
    if (!sessionId || !totalParts || !finalKey) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const fileName = finalKey.split("/").pop() || finalKey;

    const KNOWN_TYPES = ["audio_clase", "podcast", "transcripcion", "archivo", "enlace"];
    if (!KNOWN_TYPES.includes(fileType)) {
      return NextResponse.json({ error: "fileType inválido" }, { status: 400 });
    }

    const parts: Buffer[] = [];
    for (let i = 1; i <= totalParts; i++) {
      const buf = await getObjectBuffer(`temp/${sessionId}/part-${i}`);
      parts.push(buf);
    }

    const combined = Buffer.concat(parts);

    const isAudio = fileType === "audio_clase" || fileType === "podcast";
    const validation = isAudio
      ? validateAudioFile({ name: fileName, size: combined.length, type: contentType })
      : validateDocumentFile({ name: fileName, size: combined.length });
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    await uploadToR2(finalKey, combined, contentType || "application/octet-stream");

    for (let i = 1; i <= totalParts; i++) {
      await deleteFromR2(`temp/${sessionId}/part-${i}`).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
