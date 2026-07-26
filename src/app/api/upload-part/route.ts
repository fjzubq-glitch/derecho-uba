import { NextRequest, NextResponse } from "next/server";
import { uploadPart } from "@/lib/r2";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const key = formData.get("key") as string;
    const uploadId = formData.get("uploadId") as string;
    const partNumber = Number(formData.get("partNumber"));
    const chunk = formData.get("chunk") as File;

    if (!key || !uploadId || !partNumber || !chunk) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const buffer = Buffer.from(await chunk.arrayBuffer());
    const etag = await uploadPart(key, uploadId, partNumber, buffer);

    return NextResponse.json({ etag });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
