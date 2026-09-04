"use client";

type Ventana = "manana" | "noche";

function getHoraBA(date: Date): { hora: number; fechaISO: string } {
  // Hora y fecha en America/Argentina/Buenos_Aires
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  const h = Number(parts.find((p) => p.type === "hour")!.value);
  // 24 → 0
  const hora = h === 24 ? 0 : h;
  return { hora, fechaISO: `${y}-${m}-${d}` };
}

function getFechaAyer(fechaISO: string): string {
  const [y, m, d] = fechaISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

export function getVentanaActual(now = new Date()): {
  ventana: Ventana;
  clave: string;
  limite: number;
  proximaVentanaLabel: string;
} {
  const { hora, fechaISO } = getHoraBA(now);
  if (hora >= 6 && hora < 18) {
    return { ventana: "manana", clave: fechaISO, limite: 1, proximaVentanaLabel: "18:00" };
  }
  // noche: 18:00 - 05:59
  if (hora >= 18) {
    return { ventana: "noche", clave: fechaISO, limite: 2, proximaVentanaLabel: "06:00 de mañana" };
  }
  // 0-5 => noche del día anterior
  return { ventana: "noche", clave: getFechaAyer(fechaISO), limite: 2, proximaVentanaLabel: "06:00" };
}

function storageKey(clave: string, ventana: Ventana): string {
  return `analytics_accesos_${clave}_${ventana}`;
}

export function getAccesosInfo(now = new Date()): {
  ventana: Ventana;
  clave: string;
  limite: number;
  usados: number;
  proximaVentanaLabel: string;
  permitido: boolean;
} {
  const v = getVentanaActual(now);
  let usados = 0;
  try {
    const raw = localStorage.getItem(storageKey(v.clave, v.ventana));
    usados = raw ? Number(raw) || 0 : 0;
  } catch {}
  return { ...v, usados, permitido: usados < v.limite };
}

export function registrarAcceso(now = new Date()): { usados: number; limite: number } {
  const v = getVentanaActual(now);
  const key = storageKey(v.clave, v.ventana);
  let usados = 0;
  try {
    const raw = localStorage.getItem(key);
    usados = raw ? Number(raw) || 0 : 0;
    usados += 1;
    localStorage.setItem(key, String(usados));
  } catch {}
  return { usados, limite: v.limite };
}

export function intentarAcceder(now = new Date()): { permitido: boolean; usados: number; limite: number; ventana: Ventana; clave: string; proximaVentanaLabel: string } {
  const v = getVentanaActual(now);
  const key = storageKey(v.clave, v.ventana);
  let usados = 0;
  try {
    const raw = localStorage.getItem(key);
    usados = raw ? Number(raw) || 0 : 0;
  } catch {}
  if (usados >= v.limite) {
    return { permitido: false, usados, limite: v.limite, ventana: v.ventana, clave: v.clave, proximaVentanaLabel: v.proximaVentanaLabel };
  }
  try {
    localStorage.setItem(key, String(usados + 1));
  } catch {}
  return { permitido: true, usados: usados + 1, limite: v.limite, ventana: v.ventana, clave: v.clave, proximaVentanaLabel: v.proximaVentanaLabel };
}
