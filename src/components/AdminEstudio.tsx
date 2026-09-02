"use client";

import React, { useEffect, useState } from "react";
import { BookOpen, Calendar, Check, Clock, Loader2 } from "@/components/icons";

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
      await fetch("/api/admin/estudio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setRevisiones((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // silencioso
    } finally {
      setMarcando(null);
    }
  };

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
            const grupos = new Map<string, { nombre: string; items: Revision[] }>();
            for (const r of revisiones) {
              const key = r.materia_slug || r.materia_nombre || "otra";
              const g = grupos.get(key) || { nombre: r.materia_nombre || key, items: [] };
              g.items.push(r);
              grupos.set(key, g);
            }
            return [...grupos.values()].map((grupo) => (
              <section
                key={grupo.nombre}
                style={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-line-soft)",
                  overflow: "hidden",
                }}
              >
                <div
                  className="flex items-center justify-between"
                  style={{
                    padding: "14px 18px",
                    borderBottom: "1px solid var(--color-line-soft)",
                    background: "var(--color-ink-2)",
                  }}
                >
                  <span style={{ fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif", fontSize: "16px", fontWeight: 500, color: "var(--color-text)" }}>
                    {grupo.nombre}
                  </span>
                  <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-faint)" }}>
                    {grupo.items.length} pendiente{grupo.items.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div>
                  {grupo.items.map((r) => {
                    const d = diffDias(r.fecha_programada);
                    const esClase = !!r.clase_numero;
                    const titulo = esClase ? `Clase ${r.clase_numero}${r.clase_titulo ? ` — ${r.clase_titulo}` : ""}` : r.fecha_programada;
                    return (
                      <div
                        key={r.id}
                        className="flex items-center gap-4"
                        style={{
                          padding: "12px 18px",
                          borderBottom: "1px solid var(--color-line-soft)",
                        }}
                      >
                        <span
                          className="flex items-center justify-center flex-shrink-0"
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "50%",
                            border: "1px solid var(--color-gold-dim)",
                            color: "var(--color-gold)",
                          }}
                        >
                          {esClase ? <BookOpen style={{ width: "13px", height: "13px" }} /> : <Calendar style={{ width: "13px", height: "13px" }} />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {titulo}
                          </p>
                          <div className="flex items-center gap-2" style={{ marginTop: "2px" }}>
                            <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-gold)" }}>
                              {TIPO_LABEL[r.tipo] || r.tipo}
                            </span>
                            <span style={{ color: "var(--color-line)" }}>·</span>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--color-text-muted)" }}>
                              <Clock style={{ width: "11px", height: "11px" }} />
                              {labelDia(d)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => marcar(r.id)}
                          disabled={marcando === r.id}
                          style={{
                            padding: "6px 12px",
                            background: "var(--color-gold)",
                            color: "var(--color-ink)",
                            border: "none",
                            cursor: "pointer",
                            fontFamily: "var(--font-ibm-plex-mono)",
                            fontSize: "11px",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            opacity: marcando === r.id ? 0.6 : 1,
                            flexShrink: 0,
                          }}
                        >
                          {marcando === r.id ? <Loader2 style={{ width: "12px", height: "12px", animation: "spin 1s linear infinite" }} /> : <Check style={{ width: "12px", height: "12px" }} />}
                          Listo
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            ));
          })()}
        </div>
      )}
    </div>
  );
}
