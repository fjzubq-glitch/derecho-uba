import { NextRequest, NextResponse } from "next/server";
import { uploadToR2, deleteFromR2, getObjectBuffer } from "@/lib/r2";
import { isAdminRequest } from "@/lib/auth";
import { validateAudioFile, validateDocumentFile } from "@/lib/fileValidation";

const MAX_PARTS = 600;
const MAX_SESSION_PARTS = 600;

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  let sessionId: string | undefined;
  let totalParts: number | undefined;
  try {
    const body = await request.json();
    sessionId = body.sessionId;
    totalParts = body.totalParts;
    const { finalKey, contentType, fileType } = body;
    if (!sessionId || !totalParts || !finalKey) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (
      typeof sessionId !== "string" ||
      sessionId.length === 0 ||
      sessionId.length > 64 ||
      !/^[A-Za-z0-9-]+$/.test(sessionId)
    ) {
      return NextResponse.json({ error: "sessionId inválido" }, { status: 400 });
    }
    if (!Number.isInteger(totalParts) || totalParts < 1 || totalParts > MAX_PARTS) {
      return NextResponse.json({ error: "totalParts inválido" }, { status: 400 });
    }
    const partsCount = totalParts as number;

    const fileName = finalKey.split("/").pop() || finalKey;

    const KNOWN_TYPES = ["audio_clase", "podcast", "transcripcion", "archivo", "enlace", "cuestionario"];
    if (!KNOWN_TYPES.includes(fileType)) {
      return NextResponse.json({ error: "fileType inválido" }, { status: 400 });
    }

    const parts: Buffer[] = [];
    for (let i = 1; i <= partsCount; i++) {
      const buf = await getObjectBuffer(`temp/${sessionId}/part-${i}`);
      parts.push(buf);
    }

    const combined = Buffer.concat(parts);

    const isAudio = fileType === "audio_clase" || fileType === "podcast";
    const validation = isAudio
      ? validateAudioFile({ name: fileName, size: combined.length, type: contentType })
      : validateDocumentFile({ name: fileName, size: combined.length });
    if (!validation.ok) {
      await cleanupSession(sessionId, partsCount);
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    await uploadToR2(finalKey, combined, contentType || "application/octet-stream");

    await cleanupSession(sessionId, partsCount);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (typeof sessionId === "string" && typeof totalParts === "number") {
      await cleanupSession(sessionId, totalParts);
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function cleanupSession(sessionId: string, totalParts: number): Promise<void> {
  for (let i = 1; i <= Math.min(totalParts, MAX_SESSION_PARTS); i++) {
    await deleteFromR2(`temp/${sessionId}/part-${i}`).catch(() => {});
  }
}