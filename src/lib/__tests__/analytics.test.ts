import { describe, expect, it } from "vitest";
import { calcularPopCounts, calcularResumen, CONTENIDO_TIPOS, type EventoAnalitico, type MateriaAnalitica } from "../analytics";

const tipoPorArchivo = new Map<string, string | null>([
  ["a1", "audio_clase"],
  ["v1", "clase_youtube"],
  ["p1", "podcast"],
  ["t1", "transcripcion"],
  ["pun1", "archivo"],
  ["e1", "enlace"],
]);

const materias: MateriaAnalitica[] = [
  { id: "m1", nombre: "Derecho Comercial", slug: "derecho-comercial", total_clases: 5 },
  { id: "m2", nombre: "Contratos I", slug: "contratos-i", total_clases: 3 },
];

function ev(partial: Partial<EventoAnalitico>): EventoAnalitico {
  return {
    tipo: null,
    archivo_id: null,
    clase_id: null,
    nombre: null,
    materia_slug: null,
    created_at: null,
    ip_hash: null,
    ...partial,
  };
}

describe("calcularResumen", () => {
  it("cuenta visitas y visitantes únicos por IP", () => {
    const eventos = [
      ev({ tipo: "page_view", ip_hash: "ip-a", materia_slug: "derecho-comercial" }),
      ev({ tipo: "page_view", ip_hash: "ip-a", materia_slug: "derecho-comercial" }),
      ev({ tipo: "page_view", ip_hash: "ip-b", materia_slug: "contratos-i" }),
    ];
    const r = calcularResumen(eventos, tipoPorArchivo, materias);
    expect(r.totalVisitas).toBe(3);
    expect(r.visitantesUnicos).toBe(2);
  });

  it("solo cuenta reproducciones con archivo (play_start y youtube_open)", () => {
    const eventos = [
      ev({ tipo: "youtube_open", archivo_id: "v1" }),
      ev({ tipo: "play_start", archivo_id: "a1" }),
      ev({ tipo: "enlace_open", archivo_id: "e1" }),
      ev({ tipo: "heartbeat", archivo_id: null }),
      ev({ tipo: "play_start", archivo_id: null }),
    ];
    const r = calcularResumen(eventos, tipoPorArchivo, materias);
    expect(r.totalReproducciones).toBe(2);
  });

  it("los heartbeats no inflan ninguna métrica", () => {
    const eventos = [
      ev({ tipo: "heartbeat", nombre: "Ana", materia_slug: "derecho-comercial" }),
      ev({ tipo: "page_view", nombre: "Ana", materia_slug: "derecho-comercial", ip_hash: "ip-a" }),
    ];
    const r = calcularResumen(eventos, tipoPorArchivo, materias);
    expect(r.totalVisitas).toBe(1);
    expect(r.totalReproducciones).toBe(0);
    expect(r.contenidoPorTipo.reduce((a, c) => a + c.accesos, 0)).toBe(0);
  });

  it("agrega contenido consumido por tipo y por materia", () => {
    const eventos = [
      ev({ tipo: "enlace_open", archivo_id: "e1", nombre: "Ana", materia_slug: "derecho-comercial" }),
      ev({ tipo: "file_open", archivo_id: "pun1", nombre: "Ana", materia_slug: "derecho-comercial" }),
      ev({ tipo: "enlace_open", archivo_id: "e1", nombre: "Leo", materia_slug: "contratos-i" }),
    ];
    const r = calcularResumen(eventos, tipoPorArchivo, materias);
    const enlace = r.contenidoPorTipo.find((c) => c.tipo === "enlace");
    const punteo = r.contenidoPorTipo.find((c) => c.tipo === "archivo");
    expect(enlace?.accesos).toBe(2);
    expect(enlace?.personas).toBe(2);
    expect(enlace?.materias).toHaveLength(2);
    expect(punteo?.accesos).toBe(1);
    expect(r.contenidoPorTipo.map((c) => c.tipo)).toEqual(CONTENIDO_TIPOS);
  });

  it("deduplica clases vistas por clase_id (clicks repetidos no suman)", () => {
    const eventos = [
      ev({ tipo: "class_view", clase_id: "c1", nombre: "Ana" }),
      ev({ tipo: "class_view", clase_id: "c1", nombre: "Ana" }),
      ev({ tipo: "class_view", clase_id: "c2", nombre: "Ana" }),
      ev({ tipo: "class_view", clase_id: "c3", nombre: "Leo" }),
      ev({ tipo: "class_view", nombre: "Leo" }),
    ];
    const r = calcularResumen(eventos, tipoPorArchivo, materias);
    const ana = r.estudiantes.find((e) => e.nombre === "Ana");
    const leo = r.estudiantes.find((e) => e.nombre === "Leo");
    expect(ana?.clasesVistas).toBe(2);
    expect(leo?.clasesVistas).toBe(1);
  });

  it("arma el detalle por persona: visitas, porTipo, total, ultima actividad", () => {
    const eventos = [
      ev({ tipo: "page_view", nombre: "Ana", materia_slug: "derecho-comercial", created_at: "2026-08-16T10:00:00Z" }),
      ev({ tipo: "play_start", archivo_id: "a1", nombre: "Ana", materia_slug: "derecho-comercial", created_at: "2026-08-16T11:00:00Z" }),
      ev({ tipo: "page_view", nombre: "Leo", materia_slug: "contratos-i", created_at: "2026-08-16T09:00:00Z" }),
    ];
    const r = calcularResumen(eventos, tipoPorArchivo, materias);
    const ana = r.estudiantes.find((e) => e.nombre === "Ana");
    expect(ana?.visitas).toBe(1);
    expect(ana?.porTipo.audio_clase).toBe(1);
    expect(ana?.total).toBe(1);
    expect(ana?.materias).toBe(1);
    expect(ana?.ultima_actividad).toBe("2026-08-16T11:00:00Z");
    expect(r.estudiantes[0].nombre).toBe("Ana");
  });

  it("alumnos activos: solo quienes consumieron contenido (total > 0)", () => {
    const eventos = [
      ev({ tipo: "page_view", nombre: "Ana", materia_slug: "derecho-comercial" }),
      ev({ tipo: "youtube_open", archivo_id: "v1", nombre: "Leo", materia_slug: "contratos-i" }),
    ];
    const r = calcularResumen(eventos, tipoPorArchivo, materias);
    expect(r.alumnosActivos).toBe(1);
  });

  it("agrega por materia: visitas, reproducciones, estudiantes y consumo", () => {
    const eventos = [
      ev({ tipo: "page_view", nombre: "Ana", materia_slug: "derecho-comercial" }),
      ev({ tipo: "play_start", archivo_id: "a1", nombre: "Ana", materia_slug: "derecho-comercial" }),
      ev({ tipo: "youtube_open", archivo_id: "v1", nombre: "Leo", materia_slug: "contratos-i" }),
    ];
    const r = calcularResumen(eventos, tipoPorArchivo, materias);
    const comercial = r.materiasStats.find((m) => m.id === "m1");
    const contratos = r.materiasStats.find((m) => m.id === "m2");
    expect(comercial?.visitas).toBe(1);
    expect(comercial?.reproducciones).toBe(1);
    expect(comercial?.estudiantes).toBe(1);
    expect(comercial?.consumo).toBe(1);
    expect(contratos?.consumo).toBe(1);
    expect(r.materiasStats[0].id).toBe("m1");
  });

  it("respeta el total_clases de cada materia", () => {
    const r = calcularResumen([], tipoPorArchivo, materias);
    const comercial = r.materiasStats.find((m) => m.id === "m1");
    expect(comercial?.total_clases).toBe(5);
  });
});

describe("calcularPopCounts", () => {
  it("cuenta reproducciones por archivo y descarta el resto", () => {
    const eventos = [
      ev({ tipo: "play_start", archivo_id: "a1" }),
      ev({ tipo: "play_start", archivo_id: "a1" }),
      ev({ tipo: "youtube_open", archivo_id: "v1" }),
      ev({ tipo: "enlace_open", archivo_id: "e1" }),
      ev({ tipo: "page_view", archivo_id: null }),
    ];
    const pop = calcularPopCounts(eventos);
    expect(pop.get("a1")).toBe(2);
    expect(pop.get("v1")).toBe(1);
    expect(pop.has("e1")).toBe(false);
  });
});
