import { NextRequest, NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2";
import { isAdminRequest } from "@/lib/auth";

const MAX_CHUNK_BYTES = 2 * 1024 * 1024; // 2 MB por parte
const MAX_PARTS = 600; // hasta ~1.2 GB por archivo (partes de ~2MB)

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const { sessionId, partNumber, data } = await request.json();
    if (!sessionId || !partNumber || !data) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (typeof sessionId !== "string" || sessionId.length === 0 || sessionId.length > 64 || !/^[A-Za-z0-9-]+$/.test(sessionId)) {
      return NextResponse.json({ error: "sessionId inválido" }, { status: 400 });
    }
    if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > MAX_PARTS) {
      return NextResponse.json({ error: "partNumber inválido" }, { status: 400 });
    }
    if (typeof data !== "string" || data.length > MAX_CHUNK_BYTES * 2) {
      return NextResponse.json({ error: "chunk demasiado grande" }, { status: 413 });
    }

    const buffer = Buffer.from(data, "base64");
    if (buffer.length === 0 || buffer.length > MAX_CHUNK_BYTES) {
      return NextResponse.json({ error: "chunk inválido o demasiado grande" }, { status: 413 });
    }

    const key = `temp/${sessionId}/part-${partNumber}`;
    await uploadToR2(key, buffer, "application/octet-stream");

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}