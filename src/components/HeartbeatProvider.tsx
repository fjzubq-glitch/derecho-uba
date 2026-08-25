"use client";

import { useEffect } from "react";
import { trackActivity } from "@/lib/tracking";

function paginaYSlug(): { pagina: string; materia_slug?: string } {
  const path = window.location.pathname;
  const seg = path.split("/").filter(Boolean);
  if (seg[0] === "dashboard" && seg[1]) {
    if (seg[2] === "clase") return { pagina: "clase_detalle", materia_slug: seg[1] };
    return { pagina: "materia", materia_slug: seg[1] };
  }
  return { pagina: "home" };
}

export default function HeartbeatProvider() {
  useEffect(() => {
    const latido = () => {
      if (document.hidden) return;
      const { pagina, materia_slug } = paginaYSlug();
      trackActivity({ tipo: "heartbeat", pagina, materia_slug });
    };
    const inicial = setTimeout(latido, 3000);
    const interval = setInterval(latido, 60000);
    const onVisible = () => {
      if (!document.hidden) latido();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(inicial);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}