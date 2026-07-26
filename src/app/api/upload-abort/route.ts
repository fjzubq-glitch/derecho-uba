import { NextRequest, NextResponse } from "next/server";
import { abortMultipartUpload } from "@/lib/r2";

export async function POST(request: NextRequest) {
  try {
    const { key, uploadId } = await request.json();
    if (!key || !uploadId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await abortMultipartUpload(key, uploadId);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
