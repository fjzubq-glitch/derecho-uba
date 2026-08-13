import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/auth";

export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request.headers.get("cookie"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { items } = body as { items: { id: string; orden: number }[] };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items array required" }, { status: 400 });
    }

    const updates = items.map((item) =>
      getSupabaseAdmin()
        .from("archivos")
        .update({ orden: item.orden })
        .eq("id", item.id)
    );

    await Promise.all(updates);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Reorder error:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
