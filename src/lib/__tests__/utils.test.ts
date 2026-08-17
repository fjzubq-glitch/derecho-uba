import { describe, expect, it } from "vitest";
import { formatDuration, formatFechaLocal, parseFechaLocal } from "../utils";

describe("formatDuration", () => {
  it("formatea segundos a m:ss", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(59)).toBe("0:59");
    expect(formatDuration(60)).toBe("1:00");
    expect(formatDuration(65)).toBe("1:05");
  });

  it("formatea horas a h:mm:ss", () => {
    expect(formatDuration(3600)).toBe("1:00:00");
    expect(formatDuration(3661)).toBe("1:01:01");
  });

  it("tolera valores inválidos", () => {
    expect(formatDuration(NaN)).toBe("0:00");
    expect(formatDuration(-5)).toBe("0:00");
  });
});

describe("parseFechaLocal / formatFechaLocal", () => {
  it("parsa fechas YYYY-MM-DD como fecha local (sin desfase de zona)", () => {
    const d = parseFechaLocal("2026-03-12");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(12);
    expect(d.getHours()).toBe(0);
  });

  it("formatea en es-AR conservando el día correcto", () => {
    const s = formatFechaLocal("2026-03-12");
    expect(s).toContain("12");
    expect(s).toContain("2026");
  });
});
