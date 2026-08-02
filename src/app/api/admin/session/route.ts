import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, clearSessionCookieHeader } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const ok = isAdminRequest(request.headers.get("cookie"));
  return NextResponse.json({ ok });
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", clearSessionCookieHeader());
  return response;
}
