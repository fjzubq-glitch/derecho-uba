import { describe, expect, it } from "vitest";
import { diasHasta, countdownLabel, formatearFechaCorta } from "../fechas";

/** Fecha local "YYYY-MM-DD" desplazada n días desde hoy (determinística sin importar la zona horaria). */
function fechaLocalDiasDesdeHoy(n: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

describe("diasHasta", () => {
  it("calcula días relativos a hoy de forma determinística", () => {
    expect(diasHasta(fechaLocalDiasDesdeHoy(3))).toBe(3);
  });

  it("da 0 para hoy", () => {
    expect(diasHasta(fechaLocalDiasDesdeHoy(0))).toBe(0);
  });

  it("da negativo para fechas pasadas", () => {
    expect(diasHasta(fechaLocalDiasDesdeHoy(-5))).toBe(-5);
  });
});

describe("countdownLabel", () => {
  it("etiqueta día cero y uno", () => {
    expect(countdownLabel(0)).toBe("Hoy");
    expect(countdownLabel(1)).toBe("Mañana");
    expect(countdownLabel(-1)).toBe("Ayer");
  });

  it("etiqueta futuro y pasado", () => {
    expect(countdownLabel(87)).toBe("en 87 días");
    expect(countdownLabel(-12)).toBe("hace 12 días");
  });
});

describe("formatearFechaCorta", () => {
  it("formatea en español sin año", () => {
    expect(formatearFechaCorta("2026-11-12")).toBe("12 nov");
    expect(formatearFechaCorta("2026-10-02")).toBe("2 oct");
  });

  it("incluye año cuando se pide", () => {
    expect(formatearFechaCorta("2026-12-04", true)).toBe("4 dic 2026");
  });
});