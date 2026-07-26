import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const ak = (process.env.R2_ACCESS_KEY_ID || "").trim();
  const bk = (process.env.R2_BUCKET_NAME || "").trim();

  return NextResponse.json({
    accessKeyId: ak ? `${ak.slice(0, 4)}...${ak.slice(-4)}` : "(empty)",
    bucketName: bk,
    bucketHex: Array.from(bk).map((c: string) => c.charCodeAt(0).toString(16)).join(" "),
    accountId: (process.env.R2_ACCOUNT_ID || "").trim(),
    publicUrl: (process.env.R2_PUBLIC_URL || "").trim(),
  });
}
