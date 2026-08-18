import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { ipFromRequest, isRateLimited } from "@/lib/simpleRateLimit";

const RATE_KEY = "nombres";
const RATE_MAX = 60;
const RATE_WINDOW_MS = 60 * 1000;

// Server-only: se prefiere ADMIN_NOMBRE (privada) y se cae a la pública por compatibilidad.
const ADMIN_NOMBRE = (process.env.ADMIN_NOMBRE || process.env.NEXT_PUBLIC_ADMIN_NOMBRE || "").trim().toLowerCase();

export async function GET(request: NextRequest) {
  if (isRateLimited(`${RATE_KEY}:${ipFromRequest(request)}`, RATE_MAX, RATE_WINDOW_MS)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("actividad")
      .select("nombre")
      .not("nombre", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error || !data) {
      return NextResponse.json({ nombres: [] });
    }

    const vistos = new Map<string, string>();
    for (const row of data) {
      const original = (row.nombre || "").trim();
      if (!original) continue;
      const lower = original.toLowerCase();
      if (ADMIN_NOMBRE && lower === ADMIN_NOMBRE) continue;
      if (!vistos.has(lower)) {
        vistos.set(lower, original);
      }
    }

    const nombres = Array.from(vistos.values()).slice(0, 15);
    return NextResponse.json({ nombres });
  } catch (e) {
    console.error("Error fetching nombres:", e);
    return NextResponse.json({ nombres: [] });
  }
}

