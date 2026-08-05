import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const diag: Record<string, unknown> = {};

  diag.env_defined = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    R2_PUBLIC_URL: !!process.env.R2_PUBLIC_URL,
    R2_ACCOUNT_ID: !!process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: !!process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: !!process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: !!process.env.R2_BUCKET_NAME,
  };

  try {
    const admin = getSupabaseAdmin();
    const { data: materias, error } = await admin.from("materias").select("id, nombre").limit(5);
    diag.supabase = materias ? { ok: true, count: materias.length } : { ok: false, error: error?.message };
  } catch (error: unknown) {
    diag.supabase = { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  return NextResponse.json(diag);
}
