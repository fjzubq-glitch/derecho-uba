"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PortalHeader from "@/components/PortalHeader";
import { trackActivity } from "@/lib/tracking";
import { diasHasta, countdownLabel, formatearFechaCorta } from "@/lib/fechas";
import { ArrowLeft, ArrowRight } from "@/components/icons";

interface Fecha {
  id: string;
  titulo: string;
  fecha: string;
}

const DIAS_SEMANA = ["DOM", "LUN", "MAR", "MIE", "JUE", "VIE", "SAB"];

const pad = (n: number) => String(n).padStart(2, "0");

const aISO = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export default function CalendarioPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.materia as string;

  const [materia, setMateria] = useState<{ id: string; nombre: string; estado?: string; fechas?: Fecha[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const hoy = new Date();
  const [year, setYear] = useState(hoy.getFullYear());
  const [month, setMonth] = useState(hoy.getMonth());

  useEffect(() => {
    loadData();
    trackActivity({ tipo: "page_view", pagina: "calendario", materia_slug: slug });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function loadData() {
    try {
      const res = await fetch(`/api/materias/${slug}`);
      const data = await res.json();
      if (data.materia) setMateria(data.materia);
    } catch (e) {
      console.error("Error loading materia:", e);
    }
    setLoading(false);
  }

  const go = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const irAHoy = () => {
    const d = new Date();
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const fechas = useMemo(() => materia?.fechas ?? [], [materia]);

  const fechasPorDia = useMemo(() => {
    const mapa = new Map<string, Fecha[]>();
    for (const f of fechas) {
      const [y, m, d] = f.fecha.split("-").map(Number);
      if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) continue;
      const iso = aISO(y, m - 1, d);
      if (!mapa.has(iso)) mapa.set(iso, []);
      mapa.get(iso)!.push(f);
    }
    return mapa;
  }, [fechas]);

  const fechasDelMes = fechas
    .filter((f) => {
      const [y, m] = f.fecha.split("-").map(Number);
      return y === year && m === month + 1;
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const firstDay = new Date(year, month, 1);
  const offset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;

  const hoyISO = aISO(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  const nombreMes = `${firstDay.toLocaleDateString("es-AR", { month: "long", year: "numeric" })}`;
  const nombreMesCap = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);

  const splitName = (n: string) => {
    const p = n.split(",");
    return { title: p[0]?.trim() || n, meta: p.slice(1).map((s) => s.trim()).join(", ") || null };
  };

  const { title: materiaTitle, meta: materiaMeta } = materia ? splitName(materia.nombre) : { title: "", meta: null };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-ink)" }}>
      <PortalHeader
        nav={
          <button
            onClick={() => router.push(`/dashboard/${slug}`)}
            className="flex items-center gap-2"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px 0",
              fontFamily: "var(--font-ibm-plex-mono)",
              fontSize: "11px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--color-text-muted)",
              transition: "color 0.25s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-gold)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
          >
            <ArrowLeft style={{ width: "13px", height: "13px" }} />
            <span className="hidden sm:inline">Volver a la materia</span>
          </button>
        }
      />

      {/* ═══════════ CARÁTULA ═══════════ */}
      <section className="relative overflow-hidden border-b" style={{ borderColor: "var(--color-line-soft)" }}>
        <div className="relative z-10 pad-lateral" style={{ padding: "36px 48px 32px" }}>
          <div
            className="flex items-center gap-3 mb-5"
            style={{
              fontFamily: "var(--font-ibm-plex-mono)",
              fontSize: "11px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--color-gold)",
            }}
          >
            <span style={{ width: "24px", height: "1px", background: "var(--color-gold-dim)" }} />
            Calendario · {materiaTitle}
          </div>
          <div className="flex items-end justify-between gap-10 flex-wrap">
            <div>
              <h1
                style={{
                  fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                  fontWeight: 400,
                  fontSize: "clamp(30px, 4vw, 44px)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                }}
              >
                Fechas importantes
              </h1>
              <p
                className="mt-3"
                style={{
                  fontFamily: "var(--font-ibm-plex-mono)",
                  fontSize: "12px",
                  color: "var(--color-text-muted)",
                }}
              >
                {materiaMeta ?? "Calendario de la cursada"}
              </p>
            </div>
            {!loading && fechas.length > 0 && (
              <div
                style={{
                  fontFamily: "var(--font-ibm-plex-mono)",
                  fontSize: "11px",
                  letterSpacing: "0.08em",
                  color: "var(--color-text-faint)",
                  paddingBottom: "4px",
                }}
              >
                <span className="folio-num" style={{ color: "var(--color-stamp)" }}>{fechas.length}</span>{" "}
                fechas en el expediente
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════ MAIN ═══════════ */}
      <main className="flex-1">
        <div className="pad-lateral" style={{ padding: "32px 48px 80px" }}>
          {loading ? (
            <div className="skeleton" style={{ height: "420px" }} />
          ) : fechas.length === 0 ? (
            <div
              style={{
                padding: "80px 48px",
                textAlign: "center",
                background: "var(--color-card)",
                border: "1px solid var(--color-line-soft)",
              }}
            >
              <p style={{ color: "var(--color-text-muted)", fontSize: "15px", lineHeight: 1.7 }}>
                Todavía no hay fechas publicadas en esta materia.
              </p>
            </div>
          ) : (
            <>
              {/* Controles de mes */}
              <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    aria-label="Mes anterior"
                    onClick={() => go(-1)}
                    className="flex items-center justify-center"
                    style={{
                      width: "32px",
                      height: "32px",
                      border: "1px solid var(--color-line-soft)",
                      background: "none",
                      cursor: "pointer",
                      color: "var(--color-text-muted)",
                      transition: "border-color 0.2s ease, color 0.2s ease",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-gold-dim)"; e.currentTarget.style.color = "var(--color-gold)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-line-soft)"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
                  >
                    <ArrowLeft style={{ width: "14px", height: "14px" }} />
                  </button>
                  <p
                    style={{
                      fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                      fontWeight: 500,
                      fontSize: "22px",
                      color: "var(--color-text)",
                      minWidth: "150px",
                      textAlign: "center",
                    }}
                  >
                    {nombreMesCap}
                  </p>
                  <button
                    type="button"
                    aria-label="Mes siguiente"
                    onClick={() => go(1)}
                    className="flex items-center justify-center"
                    style={{
                      width: "32px",
                      height: "32px",
                      border: "1px solid var(--color-line-soft)",
                      background: "none",
                      cursor: "pointer",
                      color: "var(--color-text-muted)",
                      transition: "border-color 0.2s ease, color 0.2s ease",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-gold-dim)"; e.currentTarget.style.color = "var(--color-gold)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-line-soft)"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
                  >
                    <ArrowRight style={{ width: "14px", height: "14px" }} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={irAHoy}
                  style={{
                    padding: "6px 14px",
                    border: "1px solid var(--color-line-soft)",
                    background: "none",
                    cursor: "pointer",
                    fontFamily: "var(--font-ibm-plex-mono)",
                    fontSize: "10px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--color-text-muted)",
                    transition: "border-color 0.2s ease, color 0.2s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-gold-dim)"; e.currentTarget.style.color = "var(--color-gold)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-line-soft)"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
                >
                  Hoy
                </button>
              </div>

              {/* Grilla del mes (estilo Google Calendar) */}
              <div style={{ border: "1px solid var(--color-line-soft)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
                  {DIAS_SEMANA.map((d) => (
                    <div
                      key={d}
                      style={{
                        padding: "10px 8px",
                        fontFamily: "var(--font-ibm-plex-mono)",
                        fontSize: "9px",
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "var(--color-text-faint)",
                        textAlign: "center",
                        background: "var(--color-card)",
                        borderBottom: "1px solid var(--color-line-soft)",
                      }}
                    >
                      <span className="hidden sm:inline">{d}</span>
                      <span className="sm:hidden">{d.charAt(0)}</span>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                    gap: "1px",
                    background: "var(--color-line-soft)",
                  }}
                >
                  {Array.from({ length: totalCells }, (_, i) => {
                    const dayNum = i - offset + 1;
                    if (dayNum < 1 || dayNum > daysInMonth) {
                      return <div key={i} style={{ background: "var(--color-card)", minHeight: "92px" }} />;
                    }
                    const iso = aISO(year, month, dayNum);
                    const delDia = fechasPorDia.get(iso) ?? [];
                    const esHoy = iso === hoyISO;
                    const esPasado = aISO(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) > iso;
                    return (
                      <div
                        key={iso}
                        style={{
                          background: "var(--color-card)",
                          minHeight: "92px",
                          padding: "7px 8px",
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {esHoy ? (
                            <span
                              className="flex items-center justify-center"
                              style={{
                                width: "22px",
                                height: "22px",
                                borderRadius: "50%",
                                background: "var(--color-stamp)",
                                color: "var(--color-ink)",
                                fontFamily: "var(--font-ibm-plex-mono)",
                                fontSize: "11px",
                              }}
                            >
                              {dayNum}
                            </span>
                          ) : (
                            <span
                              style={{
                                fontFamily: "var(--font-ibm-plex-mono)",
                                fontSize: "11px",
                                color: esPasado ? "var(--color-text-faint)" : "var(--color-text-muted)",
                              }}
                            >
                              {dayNum}
                            </span>
                          )}
                          {delDia.length > 0 && (
                            <span
                              style={{
                                width: "5px",
                                height: "5px",
                                borderRadius: "50%",
                                background: delDia.some((f) => diasHasta(f.fecha) >= 0 && diasHasta(f.fecha) <= 7)
                                  ? "var(--color-stamp)"
                                  : "var(--color-gold)",
                                flexShrink: 0,
                              }}
                            />
                          )}
                        </div>
                        <div className="hidden sm:flex flex-col gap-1 mt-2">
                          {delDia.slice(0, 2).map((f) => {
                            const dias = diasHasta(f.fecha);
                            const pasada = dias < 0;
                            return (
                              <div
                                key={f.id}
                                style={{
                                  padding: "2px 6px",
                                  fontFamily: "var(--font-ibm-plex-mono)",
                                  fontSize: "9px",
                                  letterSpacing: "0.04em",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  background: pasada
                                    ? "var(--color-line-soft)"
                                    : dias <= 7
                                      ? "var(--color-stamp)"
                                      : "var(--color-gold-dim)",
                                  color: pasada
                                    ? "var(--color-text-faint)"
                                    : dias <= 7
                                      ? "var(--color-ink)"
                                      : "var(--color-gold)",
                                  textDecoration: pasada ? "line-through" : "none",
                                }}
                              >
                                {f.titulo}
                              </div>
                            );
                          })}
                          {delDia.length > 2 && (
                            <div
                              style={{
                                padding: "2px 6px",
                                fontFamily: "var(--font-ibm-plex-mono)",
                                fontSize: "9px",
                                border: "1px solid var(--color-line-soft)",
                                color: "var(--color-text-faint)",
                              }}
                            >
                              +{delDia.length - 2} más
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Hoja del mes: listado de fechas */}
              <div className="mt-10">
                <p
                  style={{
                    fontFamily: "var(--font-ibm-plex-mono)",
                    fontSize: "10px",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--color-text-faint)",
                    marginBottom: "8px",
                  }}
                >
                  <span className="folio-num" style={{ color: "var(--color-gold)" }}>
                    {String(fechasDelMes.length).padStart(2, "0")}
                  </span>{" "}
                  fechas de {nombreMesCap}
                </p>
                {fechasDelMes.length === 0 ? (
                  <div
                    style={{
                      padding: "28px 24px",
                      border: "1px solid var(--color-line-soft)",
                      background: "var(--color-card)",
                    }}
                  >
                    <p style={{ color: "var(--color-text-faint)", fontSize: "13px" }}>
                      No hay fechas pautadas en este mes.
                    </p>
                  </div>
                ) : (
                  <div>
                    {fechasDelMes.map((f) => {
                      const dias = diasHasta(f.fecha);
                      const pasada = dias < 0;
                      return (
                        <div
                          key={f.id}
                          className="flex items-center justify-between gap-3"
                          style={{
                            padding: "11px 0",
                            borderBottom: "1px solid var(--color-line-soft)",
                            opacity: pasada ? 0.55 : 1,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "var(--font-ibm-plex-mono)",
                              fontSize: "10px",
                              letterSpacing: "0.12em",
                              textTransform: "uppercase",
                              color: pasada ? "var(--color-text-faint)" : "var(--color-gold)",
                              textDecoration: pasada ? "line-through" : "none",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {f.titulo}
                          </span>
                          <span
                            className="flex-shrink-0"
                            style={{
                              fontFamily: "var(--font-ibm-plex-mono)",
                              fontSize: "11px",
                              color: pasada ? "var(--color-text-faint)" : "var(--color-text-muted)",
                              textDecoration: pasada ? "line-through" : "none",
                            }}
                          >
                            {formatearFechaCorta(f.fecha, true)}
                          </span>
                          <span
                            className="flex-shrink-0"
                            style={{
                              fontFamily: "var(--font-ibm-plex-mono)",
                              fontSize: "10px",
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: pasada ? "var(--color-text-faint)" : dias <= 7 ? "var(--color-stamp)" : "var(--color-gold)",
                            }}
                          >
                            {countdownLabel(dias)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}