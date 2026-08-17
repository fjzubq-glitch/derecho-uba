import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

const ADMIN_NOMBRE = process.env.ADMIN_NOMBRE?.trim().toLowerCase();

export const revalidate = 60;

export async function GET() {
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
