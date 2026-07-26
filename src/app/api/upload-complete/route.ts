import { NextRequest, NextResponse } from "next/server";
import { completeMultipartUpload, abortMultipartUpload } from "@/lib/r2";

export async function POST(request: NextRequest) {
  try {
    const { key, uploadId, parts } = await request.json();
    if (!key || !uploadId || !parts) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await completeMultipartUpload(key, uploadId, parts);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
