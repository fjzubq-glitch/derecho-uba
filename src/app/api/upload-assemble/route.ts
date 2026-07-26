import { NextRequest, NextResponse } from "next/server";
import { uploadToR2, deleteFromR2, getAudioPublicUrl } from "@/lib/r2";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, totalParts, finalKey, contentType, fileSize } = await request.json();
    if (!sessionId || !totalParts || !finalKey) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const parts: Buffer[] = [];
    for (let i = 1; i <= totalParts; i++) {
      const partKey = `temp/${sessionId}/part-${i}`;
      const url = getAudioPublicUrl(partKey);
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch part ${i}: ${res.status}`);
      }
      const arrayBuf = await res.arrayBuffer();
      parts.push(Buffer.from(arrayBuf));
    }

    const combined = Buffer.concat(parts);
    await uploadToR2(finalKey, combined, contentType || "application/octet-stream");

    for (let i = 1; i <= totalParts; i++) {
      await deleteFromR2(`temp/${sessionId}/part-${i}`).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
