import { describe, expect, it } from "vitest";
import { diasHasta, countdownLabel, formatearFechaCorta } from "../fechas";

describe("diasHasta", () => {
  it("calcula días relativos a hoy de forma determinística", () => {
    const hoy = new Date();
    const maniana = new Date(hoy.getTime() + 3 * 24 * 60 * 60 * 1000);
    const iso = maniana.toISOString().slice(0, 10);
    expect(diasHasta(iso)).toBe(3);
  });

  it("da 0 para hoy", () => {
    const hoy = new Date();
    const iso = hoy.toISOString().slice(0, 10);
    expect(diasHasta(iso)).toBe(0);
  });

  it("da negativo para fechas pasadas", () => {
    const antes = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const iso = antes.toISOString().slice(0, 10);
    expect(diasHasta(iso)).toBe(-5);
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