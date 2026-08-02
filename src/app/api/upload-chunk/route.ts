import { NextRequest, NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2";
import { isAdminRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const { sessionId, partNumber, data } = await request.json();
    if (!sessionId || !partNumber || !data) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const key = `temp/${sessionId}/part-${partNumber}`;
    const buffer = Buffer.from(data, "base64");
    await uploadToR2(key, buffer, "application/octet-stream");

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
