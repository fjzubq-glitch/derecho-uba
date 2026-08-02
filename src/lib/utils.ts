export function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(" ");
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/
  );
  return match ? match[1] : null;
}

export function getYouTubeThumbnail(url: string): string | null {
  const id = extractYouTubeId(url);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
}

// Convierte "YYYY-MM-DD" (date de Supabase, sin zona) en una fecha local,
// evitando que new Date("2026-03-12") se parse como medianoche UTC y
// muestre el día anterior en zonas como America/Buenos_Aires (UTC-3).
export function parseFechaLocal(fecha: string): Date {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function formatFechaLocal(fecha: string, opts: Intl.DateTimeFormatOptions = {}): string {
  return parseFechaLocal(fecha).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...opts,
  });
}

// ── Resumen de reproducción (localStorage) ──
const RESUME_PREFIX = "derecho:resume:";
const VISTAS_PREFIX = "derecho:vistas";

export function saveResumeTime(archivoId: string, time: number): void {
  try {
    localStorage.setItem(RESUME_PREFIX + archivoId, String(Math.floor(time)));
  } catch {}
}

export function getResumeTime(archivoId: string): number {
  try {
    const v = localStorage.getItem(RESUME_PREFIX + archivoId);
    return v ? Number(v) || 0 : 0;
  } catch {
    return 0;
  }
}

export function clearResumeTime(archivoId: string): void {
  try {
    localStorage.removeItem(RESUME_PREFIX + archivoId);
  } catch {}
}

// ── Clases vistas (localStorage) ──
export function getVistas(): Record<string, number> {
  try {
    const v = localStorage.getItem(VISTAS_PREFIX);
    return v ? JSON.parse(v) : {};
  } catch {
    return {};
  }
}

export function markVista(claseId: string): Record<string, number> {
  const vistas = getVistas();
  if (!vistas[claseId]) {
    vistas[claseId] = Date.now();
    try {
      localStorage.setItem(VISTAS_PREFIX, JSON.stringify(vistas));
    } catch {}
  }
  return vistas;
}

// ── Admin session (localStorage) ──
const ADMIN_KEY = "derecho:admin";

export function isAdminSession(): boolean {
  try {
    return localStorage.getItem(ADMIN_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAdminSession(): void {
  try {
    localStorage.setItem(ADMIN_KEY, "1");
  } catch {}
}

export function clearAdminSession(): void {
  try {
    localStorage.removeItem(ADMIN_KEY);
  } catch {}
}
