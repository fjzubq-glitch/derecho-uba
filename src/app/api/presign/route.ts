import { NextRequest, NextResponse } from "next/server";
import { getPresignedUploadUrl } from "@/lib/r2";

export async function POST(request: NextRequest) {
  try {
    const { filename, contentType } = await request.json();
    if (!filename || !contentType) {
      return NextResponse.json({ error: "filename and contentType required" }, { status: 400 });
    }

    const storageKey = `uploads/${Date.now()}-${filename}`;
    const uploadUrl = await getPresignedUploadUrl(storageKey, contentType);

    return NextResponse.json({ uploadUrl, storageKey });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
