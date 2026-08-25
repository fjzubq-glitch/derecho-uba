import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, createVisorToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const archivoId = request.nextUrl.searchParams.get("id");
  if (!archivoId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  return NextResponse.json({ token: createVisorToken(archivoId) });
}
