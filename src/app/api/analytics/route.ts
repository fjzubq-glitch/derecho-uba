import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hashIp } from "@/lib/hashIp";
import { ipFromRequest, isRateLimited } from "@/lib/simpleRateLimit";

const RATE_KEY = "analytics";
const RATE_MAX = 30;
const RATE_WINDOW_MS = 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    if (isRateLimited(`${RATE_KEY}:${ipFromRequest(request)}`, RATE_MAX, RATE_WINDOW_MS)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

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
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ ok: true }); // No fallar para el usuario
  }
}