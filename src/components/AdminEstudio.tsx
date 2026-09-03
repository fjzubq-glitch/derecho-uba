"use client";

import React, { useEffect, useState } from "react";
import { BookOpen, Calendar, Check, ChevronDown, Clock, Loader2 } from "@/components/icons";

interface Revision {
  id: string;
  tipo: string;
  fecha_programada: string;
  hecha: boolean;
  materia_nombre?: string;
  materia_slug?: string;
  clase_numero?: number | null;
  clase_titulo?: string | null;
}

const TIPO_LABEL: Record<string, string> = {
  inicial: "Estudio inicial",
  repaso1: "Repaso 1 (3 días)",
  repaso2: "Repaso 2 (7 días)",
  repaso3: "Repaso 3 (21 días)",
  examen_repaso: "Refuerzo pre-examen",
  examen_vistazo: "Último vistazo",
};

function diffDias(fecha: string): number {
  const f = new Date(`${fecha}T00:00:00`);
  const hoy = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00`);
  return Math.round((f.getTime() - hoy.getTime()) / 86400000);
}

function labelDia(d: number): string {
  if (d < 0) return `hace ${-d} día${-d > 1 ? "s" : ""}`;
  if (d === 0) return "hoy";
  return `en ${d} día${d > 1 ? "s" : ""}`;
}

export default function AdminEstudio() {
  const [revisiones, setRevisiones] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);
  const [marcando, setMarcando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());

  const cargar = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/estudio");
      const data = await res.json();
      if (data.ok) {
        setRevisiones(data.revisiones || []);
      } else {
        setError(data.error || "Error al cargar");
      }
    } catch {
      setError("No se pudo cargar el plan de estudio");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const marcar = async (id: string) => {
    setMarcando(id);
    try {
      const res = await fetch("/api/admin/estudio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      const nuevaHecha = data.hecha;
      setRevisiones((prev) => prev.map((r) => (r.id === id ? { ...r, hecha: typeof nuevaHecha === "boolean" ? nuevaHecha : !r.hecha, completada_at: typeof nuevaHecha === "boolean" && nuevaHecha ? new Date().toISOString() : null } : r)));
    } catch {
      // silencioso
    } finally {
      setMarcando(null);
    }
  };

  const hoyStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Cabeza */}
      <div className="flex items-center gap-3">
        <span
          className="flex items-center justify-center"
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "50%",
            border: "1px solid var(--color-gold-dim)",
            color: "var(--color-gold)",
          }}
        >
          <BookOpen style={{ width: "17px", height: "17px" }} />
        </span>
        <div>
          <h3 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif", fontWeight: 400, fontSize: "20px", color: "var(--color-text)" }}>
            Plan de estudio
          </h3>
          <p style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-text-faint)" }}>
            Repaso espaciado · 3 / 7 / 21 días + pre-examen
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2" style={{ padding: "24px 0", color: "var(--color-text-muted)", fontFamily: "var(--font-ibm-plex-mono)", fontSize: "12px" }}>
          <Loader2 style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} /> Cargando tu plan…
        </div>
      ) : error ? (
        <div style={{ padding: "16px 20px", background: "rgba(224,85,85,0.08)", border: "1px solid rgba(224,85,85,0.3)" }}>
          <p style={{ fontSize: "13px", color: "#E05555" }}>{error}</p>
        </div>
      ) : revisiones.length === 0 ? (
        <div
          style={{
            background: "var(--color-card)",
            border: "1px solid var(--color-line-soft)",
            padding: "40px 32px",
            textAlign: "center",
          }}
        >
          <p style={{ fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif", fontSize: "18px", color: "var(--color-text)", marginBottom: "8px" }}>
            No hay repasos pendientes
          </p>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", lineHeight: 1.6, maxWidth: "440px", margin: "0 auto" }}>
            Cuando subas contenido a una clase, el plan crea automáticamente su repaso al día 0, 3, 7 y 21. También se arman refuerzos antes de cada parcial o final.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {(() => {
            // Agrupar por materia -> clases
            const porMateria = new Map<string, { nombre: string; clases: Map<string, { numero: number | null; titulo: string | null; items: Map<string, Revision> }> }>();
            for (const r of revisiones) {
              if (!r.clase_numero) continue; // solo clases para la vista de cuadros; exámenes van aparte
              const mKey = r.materia_slug || r.materia_nombre || "otra";
              let mat = porMateria.get(mKey);
              if (!mat) {
                mat = { nombre: r.materia_nombre || mKey, clases: new Map() };
                porMateria.set(mKey, mat);
              }
              const cKey = String(r.clase_numero);
              let clase = mat.clases.get(cKey);
              if (!clase) {
                clase = { numero: r.clase_numero ?? null, titulo: r.clase_titulo ?? null, items: new Map() };
                mat.clases.set(cKey, clase);
              }
              clase.items.set(r.tipo, r);
            }
            if (porMateria.size === 0) {
              return (
                <div style={{ padding: "16px", color: "var(--color-text-muted)", fontSize: "13px" }}>
                  No hay clases con plan aún. Subí contenido a una clase y aparecerá aquí.
                </div>
              );
            }
            return [...porMateria.values()].map((mat) => {
              const clasesOrdenadas = [...mat.clases.values()].sort((a, b) => (a.numero || 0) - (b.numero || 0));
              const pendientesMat = clasesOrdenadas.reduce((acc, c) => acc + [...c.items.values()].filter((r) => !r.hecha && r.fecha_programada <= hoyStr).length, 0);
              const abierta = abiertas.has(mat.nombre);
              return (
                <section
                  key={mat.nombre}
                  style={{ background: "var(--color-card)", border: "1px solid var(--color-line-soft)", overflow: "hidden" }}
                >
                  <button
                    onClick={() => setAbiertas((prev) => { const n = new Set(prev); if (n.has(mat.nombre)) n.delete(mat.nombre); else n.add(mat.nombre); return n; })}
                    className="flex items-center justify-between w-full text-left"
                    style={{ padding: "14px 18px", background: "var(--color-ink-2)", border: "none", borderBottom: abierta ? "1px solid var(--color-line-soft)" : "none", cursor: "pointer", width: "100%" }}
                  >
                    <span style={{ fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif", fontSize: "16px", fontWeight: 500, color: "var(--color-text)" }}>{mat.nombre}</span>
                    <span className="flex items-center gap-3">
                      <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-faint)" }}>
                        {pendientesMat} pendiente{pendientesMat !== 1 ? "s" : ""} · {clasesOrdenadas.length} clases
                      </span>
                      <ChevronDown style={{ width: "14px", height: "14px", color: "var(--color-text-muted)", transform: abierta ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }} />
                    </span>
                  </button>
                  {abierta && (
                  <div>
                    {clasesOrdenadas.map((clase) => (
                      <div
                        key={String(clase.numero)}
                        className="flex items-center gap-3"
                        style={{ padding: "12px 18px", borderBottom: "1px solid var(--color-line-soft)" }}
                      >
                        <span
                          className="flex items-center justify-center flex-shrink-0"
                          style={{ width: "30px", height: "30px", borderRadius: "50%", border: "1px solid var(--color-gold-dim)", color: "var(--color-gold)" }}
                        >
                          <BookOpen style={{ width: "13px", height: "13px" }} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            Clase {clase.numero}
                            {clase.titulo ? ` — ${clase.titulo}` : ""}
                          </p>
                          <p style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", color: "var(--color-text-faint)", marginTop: "2px" }}>
                            Repasos
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {(["repaso1", "repaso2", "repaso3"] as const).map((tipo) => {
                            const r = clase.items.get(tipo) as Revision | undefined;
                            const label = tipo === "repaso1" ? "3" : tipo === "repaso2" ? "7" : "21";
                            if (!r) {
                              return (
                                <span
                                  key={tipo}
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    border: "1px dashed var(--color-line)",
                                    fontFamily: "var(--font-ibm-plex-mono)",
                                    fontSize: "11px",
                                    color: "var(--color-text-faint)",
                                  }}
                                >
                                  {label}
                                </span>
                              );
                            }
                            const hecha = r.hecha;
                            const vencido = !hecha && r.fecha_programada <= hoyStr;
                            const futuro = !hecha && r.fecha_programada > hoyStr;
                            return (
                              <button
                                key={r.id}
                                onClick={() => marcar(r.id)}
                                disabled={marcando === r.id || futuro}
                                title={`${TIPO_LABEL[tipo] || tipo} · ${r.fecha_programada} ${hecha ? "(hecho - click para desmarcar)" : futuro ? "(futuro)" : "(click para marcar)"}`}
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  border: `1px solid ${hecha ? "var(--color-gold)" : vencido ? "var(--color-gold-dim)" : "var(--color-line-soft)"}`,
                                  background: hecha ? "var(--color-gold)" : vencido ? "transparent" : "var(--color-ink)",
                                  color: hecha ? "var(--color-ink)" : vencido ? "var(--color-gold)" : "var(--color-text-faint)",
                                  cursor: futuro ? "default" : "pointer",
                                  opacity: futuro ? 0.5 : marcando === r.id ? 0.6 : 1,
                                  fontFamily: "var(--font-ibm-plex-mono)",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                }}
                              >
                                {hecha ? <Check style={{ width: "12px", height: "12px" }} /> : marcando === r.id ? <Loader2 style={{ width: "12px", height: "12px", animation: "spin 1s linear infinite" }} /> : label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  )}
                </section>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}
