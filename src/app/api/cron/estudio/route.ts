import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sincronizarRevisiones, obtenerColaHoy, hoyLocal } from "@/lib/estudio";
import { enviarTelegram } from "@/lib/telegram";
export const dynamic = "force-dynamic";

// Se invoca por Vercel Cron (sin sesión de admin).
// Protegemos con CRON_SECRET si está definido.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }
  }

  try {
    await sincronizarRevisiones();
    const { revisiones } = await obtenerColaHoy();

    if (revisiones.length === 0) {
      return NextResponse.json({ ok: true, pendientes: 0 });
    }

    const hoy = hoyLocal();
    const supabase = getSupabaseAdmin();

    // Evitar spam: solo notificar una vez por día (guía en estudio_notifs)
    const { data: notif } = await supabase
      .from("estudio_notifs")
      .select("id")
      .eq("fecha", hoy)
      .maybeSingle();

    if (!notif) {
      // Agrupar por materia para un mensaje más limpio
      const porMateria = new Map<string, { nombre: string; total: number }>();
      for (const r of revisiones) {
        const key = r.materia_nombre || "General";
        const cur = porMateria.get(key) || { nombre: key, total: 0 };
        cur.total += 1;
        porMateria.set(key, cur);
      }

      const lineas = [...porMateria.values()].map(
        (m) => `• ${m.nombre}: ${m.total} repaso${m.total > 1 ? "s" : ""}`
      );

      const texto = [
        `<b>📚 Plan de estudio de hoy</b>`,
        ``,
        `Tenés <b>${revisiones.length}</b> repaso${revisiones.length > 1 ? "s" : ""} pendiente${revisiones.length > 1 ? "s" : ""}:`,
        ...lineas,
        ``,
        `Entrá al panel → pestaña <b>Estudio</b> para verlos y marcarlos.`,
      ].join("\n");

      await enviarTelegram(texto);
      await supabase.from("estudio_notifs").insert({ fecha: hoy });
    }

    return NextResponse.json({ ok: true, pendientes: revisiones.length });
  } catch (e) {
    console.error("Cron estudio error:", e);
    return NextResponse.json({ ok: false, error: "Error en cron" }, { status: 500 });
  }
}
