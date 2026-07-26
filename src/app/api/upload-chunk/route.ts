import { NextRequest, NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const sessionId = formData.get("sessionId") as string;
    const partNumber = formData.get("partNumber") as string;
    const chunk = formData.get("chunk") as File;

    if (!sessionId || !partNumber || !chunk) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const key = `temp/${sessionId}/part-${partNumber}`;
    const buffer = Buffer.from(await chunk.arrayBuffer());
    await uploadToR2(key, buffer, chunk.type || "application/octet-stream");

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
