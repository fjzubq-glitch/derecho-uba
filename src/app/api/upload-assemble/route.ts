import { NextRequest, NextResponse } from "next/server";
import { uploadToR2, deleteFromR2, getObjectBuffer } from "@/lib/r2";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, totalParts, finalKey, contentType } = await request.json();
    if (!sessionId || !totalParts || !finalKey) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const parts: Buffer[] = [];
    for (let i = 1; i <= totalParts; i++) {
      const buf = await getObjectBuffer(`temp/${sessionId}/part-${i}`);
      parts.push(buf);
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
