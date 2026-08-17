const DAY_MS = 24 * 60 * 60 * 1000;

/** Días hasta una fecha (0 = hoy, negativo = pasó). El `date` es "YYYY-MM-DD" o "YYYY-MM-DDTHH:mm:ss". */
export function diasHasta(fecha: string): number {
  const target = new Date(`${fecha.slice(0, 10)}T00:00:00`);
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - todayMidnight.getTime()) / DAY_MS);
}

/** "Hoy", "Mañana", "Ayer", "en 87 días", "hace 12 días" */
export function countdownLabel(dias: number): string {
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  if (dias === -1) return "Ayer";
  if (dias > 1) return `en ${dias} días`;
  return `hace ${Math.abs(dias)} días`;
}

/** Fecha corta en español: "12 nov" / "2 oct 2026". */
export function formatearFechaCorta(fecha: string, conAnio = false): string {
  const d = new Date(`${fecha.slice(0, 10)}T00:00:00`);
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const dia = d.getDate();
  const mes = meses[d.getMonth()];
  return conAnio ? `${dia} ${mes} ${d.getFullYear()}` : `${dia} ${mes}`;
}