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
      // Plan de 2 por día: solo notificar las 2 más antiguas
      const hoyLista = revisiones.slice(0, 2);
      const lineas = hoyLista.map((r) => {
        const mat = r.materia_nombre || "Materia";
        const cl = r.clase_numero ? `Clase ${r.clase_numero}${r.clase_titulo ? ` — ${r.clase_titulo}` : ""}` : "";
        const tipo = r.tipo === "repaso1" ? "3d" : r.tipo === "repaso2" ? "7d" : r.tipo === "repaso3" ? "21d" : r.tipo;
        return `• ${mat} · ${cl} (${tipo})`;
      });

      const texto = [
        `<b>📚 Plan de estudio — hoy 08:00</b>`,
        ``,
        `Hoy te tocan <b>${hoyLista.length}</b> repasos:`,
        ...lineas,
        ``,
        `Entrá a /admin → <b>Estudio</b> para marcarlos. Quedan ${revisiones.length - hoyLista.length} en cola.`,
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
