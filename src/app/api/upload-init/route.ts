import { NextRequest, NextResponse } from "next/server";
import { initiateMultipartUpload } from "@/lib/r2";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { filename, contentType } = await request.json();
    if (!filename || !contentType) {
      return NextResponse.json({ error: "filename and contentType required" }, { status: 400 });
    }

    const key = `uploads/${Date.now()}-${filename}`;
    const uploadId = await initiateMultipartUpload(key, contentType);

    return NextResponse.json({ uploadId, key });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
