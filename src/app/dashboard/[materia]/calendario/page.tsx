"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PortalHeader from "@/components/PortalHeader";
import { trackActivity } from "@/lib/tracking";
import { diasHasta, countdownLabel, formatearFechaCorta } from "@/lib/fechas";
import { ArrowLeft } from "@/components/icons";

interface Fecha {
  id: string;
  titulo: string;
  fecha: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

export default function CalendarioPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.materia as string;

  const [materia, setMateria] = useState<{ id: string; nombre: string; estado?: string; fechas?: Fecha[] } | null>(null);
  const [loading, setLoading] = useState(true);

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

  const fechas = useMemo(() => materia?.fechas ?? [], [materia]);

  const ordenadas = useMemo(() => {
    return [...fechas].sort((a, b) => {
      const pa = diasHasta(a.fecha) < 0;
      const pb = diasHasta(b.fecha) < 0;
      if (pa && pb) return b.fecha.localeCompare(a.fecha);
      if (pa !== pb) return pa ? 1 : -1;
      return a.fecha.localeCompare(b.fecha);
    });
  }, [fechas]);

  const proximaId = fechas.find((f) => diasHasta(f.fecha) >= 0)?.id ?? null;
  const totalProximas = fechas.filter((f) => diasHasta(f.fecha) >= 0).length;

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
            Expediente · {materiaTitle}
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
                fechas · <span style={{ color: totalProximas > 0 ? "var(--color-stamp)" : "var(--color-text-faint)" }}>{totalProximas}</span> pendientes
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════ MAIN ═══════════ */}
      <main className="flex-1">
        <div className="pad-lateral" style={{ padding: "32px 48px 80px" }}>
          {loading ? (
            <div className="skeleton" style={{ height: "320px" }} />
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
            <div style={{ border: "1px solid var(--color-line-soft)" }}>
              {/* Encabezado de columnas (desktop) */}
              <div
                className="hidden md:grid gap-x-4"
                style={{
                  gridTemplateColumns: "36px 1fr 130px 150px",
                  padding: "10px 16px",
                  borderBottom: "1px solid var(--color-line-soft)",
                  background: "var(--color-card)",
                  fontFamily: "var(--font-ibm-plex-mono)",
                  fontSize: "9px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--color-text-faint)",
                }}
              >
                <span>N°</span>
                <span>Fecha</span>
                <span>Día</span>
                <span>Restan</span>
              </div>

              {/* Filas */}
              {ordenadas.map((f, i) => {
                const dias = diasHasta(f.fecha);
                const pasada = dias < 0;
                const esProxima = f.id === proximaId;
                return (
                  <div
                    key={f.id}
                    className="grid grid-cols-[3px_28px_1fr] md:grid-cols-[3px_36px_1fr_130px_150px] gap-x-4"
                    style={{
                      padding: "13px 16px",
                      borderBottom: "1px solid var(--color-line-soft)",
                      background: pasada ? "transparent" : esProxima ? "var(--color-card-hover)" : "var(--color-card)",
                    }}
                  >
                    {/* Marca de la próxima fecha */}
                    <span style={{ background: esProxima ? "var(--color-stamp)" : "transparent", alignSelf: "stretch" }} />

                    <span
                      style={{
                        fontFamily: "var(--font-ibm-plex-mono)",
                        fontSize: "10px",
                        letterSpacing: "0.1em",
                        color: pasada ? "var(--color-text-faint)" : esProxima ? "var(--color-stamp)" : "var(--color-gold)",
                        paddingTop: "1px",
                      }}
                    >
                      {pad(i + 1)}
                    </span>

                    <div className="min-w-0">
                      <p
                        style={{
                          fontFamily: "var(--font-ibm-plex-mono)",
                          fontSize: "11px",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: pasada ? "var(--color-text-faint)" : "var(--color-text)",
                          textDecoration: pasada ? "line-through" : "none",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {f.titulo}
                      </p>
                      <p
                        className="md:hidden mt-1"
                        style={{
                          fontFamily: "var(--font-ibm-plex-mono)",
                          fontSize: "10px",
                          color: "var(--color-text-muted)",
                          textDecoration: pasada ? "line-through" : "none",
                        }}
                      >
                        {formatearFechaCorta(f.fecha, true)} ·{" "}
                        <span
                          style={{
                            color: pasada ? "var(--color-text-faint)" : dias <= 7 ? "var(--color-stamp)" : "var(--color-gold)",
                          }}
                        >
                          {countdownLabel(dias)}
                        </span>
                      </p>
                    </div>

                    <span
                      className="hidden md:block"
                      style={{
                        fontFamily: "var(--font-ibm-plex-mono)",
                        fontSize: "12px",
                        color: pasada ? "var(--color-text-faint)" : "var(--color-text-muted)",
                        textDecoration: pasada ? "line-through" : "none",
                        paddingTop: "1px",
                      }}
                    >
                      {formatearFechaCorta(f.fecha, true)}
                    </span>

                    <span
                      className="hidden md:block"
                      style={{
                        fontFamily: "var(--font-ibm-plex-mono)",
                        fontSize: "10px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: pasada ? "var(--color-text-faint)" : dias <= 7 ? "var(--color-stamp)" : "var(--color-gold)",
                        paddingTop: "2px",
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
      </main>
    </div>
  );
}