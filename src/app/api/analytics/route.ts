import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { archivo_id } = body;

  if (!archivo_id) {
    return NextResponse.json({ error: "archivo_id required" }, { status: 400 });
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0] || "unknown";
  const ipHash = await hashIp(ip);

  await getSupabaseAdmin().from("reproducciones").insert({
    archivo_id,
    ip_hash: ipHash,
  });

  await getSupabaseAdmin().rpc("increment_play_count", { file_id: archivo_id });

  return NextResponse.json({ ok: true });
}

async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + process.env.IP_SALT || "derecho-uba-salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
