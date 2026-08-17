"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PortalHeader from "@/components/PortalHeader";
import WelcomeGate from "@/components/WelcomeGate";
import InkStamp from "@/components/InkStamp";
import { trackActivity } from "@/lib/tracking";
import { formatFechaLocal } from "@/lib/utils";
import { diasHasta, countdownLabel, formatearFechaCorta } from "@/lib/fechas";
import { ArrowLeft, ArrowRight, Calendar, Headphones, FileText, Volume2, Link2, Play, ChevronDown, X } from "@/components/icons";

interface Archivo {
  id: string;
  tipo: string;
  nombre_display: string;
  storage_key: string | null;
  youtube_url: string | null;
  duration_seconds: number | null;
}

interface Clase {
  id: string;
  numero: number;
  titulo: string;
  tema: string | null;
  fecha: string;
  archivos: Archivo[];
}

export default function MateriaPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.materia as string;

  const [materia, setMateria] = useState<{ id: string; nombre: string; estado?: string; fechas?: Array<{ id: string; titulo: string; fecha: string }> } | null>(null);
  const [clases, setClases] = useState<Clase[]>([]);
  const [loading, setLoading] = useState(true);
  const [fechasAbiertas, setFechasAbiertas] = useState(false);

  useEffect(() => {
    loadData();
    trackActivity({ tipo: "page_view", pagina: "materia", materia_slug: slug });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function loadData() {
    try {
      const res = await fetch(`/api/materias/${slug}`);
      const data = await res.json();
      if (data.materia) setMateria(data.materia);
      if (data.clases) setClases(data.clases);
    } catch (e) {
      console.error("Error loading materia:", e);
    }
    setLoading(false);
  }

  const splitName = (n: string) => {
    const p = n.split(",");
    return { title: p[0]?.trim() || n, meta: p.slice(1).map((s) => s.trim()).join(", ") || null };
  };

  const { title: materiaTitle, meta: materiaMeta } = materia ? splitName(materia.nombre) : { title: "", meta: null };

  const tieneRecurso = (c: Clase, tipo: string) => c.archivos.some((a) => a.tipo === tipo);
// enlaces de toda la materia
const enlaces = clases.flatMap((c) =>
  c.archivos.filter((a) => a.tipo === "enlace").map((a) => ({ ...a, clase: c }))
);

  const claseHref = (numero: number) => `/dashboard/${slug}/clase/${numero}`;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-ink)" }}>
      <WelcomeGate materiaSlug={slug} />
      <PortalHeader
        nav={
          <button
            onClick={() => router.push("/dashboard")}
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
            <span className="hidden sm:inline">Volver a materias</span>
          </button>
        }
      />

      {/* ═══════════ HEADER MATERIA (carátula) ═══════════ */}
      <section className="relative overflow-hidden border-b" style={{ borderColor: "var(--color-line-soft)" }}>
        <div className="relative z-10 pad-lateral" style={{ padding: "40px 48px 36px" }}>
          <div className="flex items-start justify-between gap-10">
            <div>
              <div
                className="flex items-center gap-3 mb-6"
                style={{
                  fontFamily: "var(--font-ibm-plex-mono)",
                  fontSize: "11px",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--color-gold)",
                }}
              >
                <span style={{ width: "24px", height: "1px", background: "var(--color-gold-dim)" }} />
                Materia
              </div>
              <h1
                style={{
                  fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                  fontWeight: 400,
                  fontSize: "clamp(34px, 4.5vw, 52px)",
                  lineHeight: 1.08,
                  letterSpacing: "-0.02em",
                  maxWidth: "760px",
                  overflowWrap: "break-word",
                }}
              >
                {materiaTitle}
              </h1>
              {materiaMeta && (
                <p
                  className="mt-4"
                  style={{
                    fontFamily: "var(--font-ibm-plex-mono)",
                    fontSize: "12px",
                    color: "var(--color-text-muted)",
                    overflowWrap: "break-word",
                  }}
                >
                  {materiaMeta}
                </p>
              )}
              {!loading && clases.length > 0 && (
                <div
                  className="flex items-center gap-3 mt-6"
                  style={{
                    fontFamily: "var(--font-ibm-plex-mono)",
                    fontSize: "11px",
                    letterSpacing: "0.08em",
                    color: "var(--color-text-faint)",
                  }}
                >
                  <span>
                    <span className="folio-num" style={{ color: "var(--color-stamp)" }}>{clases.length}</span>{" "}
                    folios
                  </span>
                  <span style={{ color: "var(--color-line)" }}>·</span>
                  <span style={{ color: materia?.estado === "finalizada" ? "var(--color-gold)" : "var(--color-text-muted)" }}>
                    {materia?.estado === "finalizada" ? "Finalizada" : "En curso"}
                  </span>
</div>
              )}
            </div>

            {/* Sello de la carátula: iniciales de la materia */}
            {materiaTitle && (
              <div className="hidden md:block flex-shrink-0">
                <div className="hero-stamp">
                  <InkStamp
                    size={150}
                    titulo="EXPEDIENTE"
                    subtitulo="UBA · DERECHO"
                    rotate={-8}
                  >
                    <text
                      x="50"
                      y="82"
                      textAnchor="middle"
                      fontFamily="var(--font-special-elite), 'Courier New', monospace"
                      fontSize="9"
                      fill="var(--color-stamp)"
                      stroke="none"
                    >
                      {materiaTitle.split(" ").slice(0, 2).map((w) => w.charAt(0)).join(".").toUpperCase()}
                    </text>
                  </InkStamp>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════ MAIN ═══════════ */}
      <main className="flex-1">
        <div className="pad-lateral" style={{ padding: "40px 48px 80px" }}>
          {/* Fechas importantes */}
          {!loading && materia?.fechas && materia.fechas.length > 0 && (
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <div
                    style={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-line-soft)",
                      borderTop: "2px solid var(--color-gold-dim)",
                      borderRadius: 0,
                      padding: "24px 26px 18px",
                    }}
                  >
                    {/* Header de la card */}
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Calendar style={{ width: "14px", height: "14px", color: "var(--color-gold)", flexShrink: 0 }} />
                        <p
                          style={{
                            fontFamily: "var(--font-ibm-plex-mono)",
                            fontSize: "10px",
                            letterSpacing: "0.16em",
                            textTransform: "uppercase",
                            color: "var(--color-gold)",
                          }}
                        >
                          Fechas importantes
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {fechasAbiertas && (
                          <button
                            onClick={() => setFechasAbiertas(false)}
                            aria-label="Cerrar calendario"
                            className="flex items-center justify-center"
                            style={{
                              width: "26px",
                              height: "26px",
                              border: "1px solid var(--color-line-soft)",
                              background: "none",
                              cursor: "pointer",
                              color: "var(--color-text-muted)",
                              transition: "border-color 0.2s ease, color 0.2s ease",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-gold-dim)"; e.currentTarget.style.color = "var(--color-gold)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-line-soft)"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
                          >
                            <X style={{ width: "12px", height: "12px" }} />
                          </button>
                        )}
                        <span
                          style={{
                            fontFamily: "var(--font-ibm-plex-mono)",
                            fontSize: "10px",
                            letterSpacing: "0.1em",
                            color: "var(--color-text-faint)",
                          }}
                        >
                          <span className="folio-num">{String(materia.fechas.length).padStart(2, "0")}</span>{" "}
                          FECHAS
                        </span>
                      </div>
                    </div>

                {/* Próxima fecha destacada */}
                {(() => {
                  const pf = materia.fechas!.find((f) => diasHasta(f.fecha) >= 0);
                  if (!pf) return null;
                  const dias = diasHasta(pf.fecha);
                  return (
                    <div className="pt-4" style={{ borderTop: "1px solid var(--color-line-soft)" }}>
                      <p
                        style={{
                          fontFamily: "var(--font-ibm-plex-mono)",
                          fontSize: "9px",
                          letterSpacing: "0.16em",
                          textTransform: "uppercase",
                          color: "var(--color-stamp)",
                        }}
                      >
                        Próxima fecha
                      </p>
                      <p
                        style={{
                          fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                          fontWeight: 500,
                          fontSize: "19px",
                          lineHeight: 1.25,
                          color: "var(--color-text)",
                          marginTop: "6px",
                        }}
                      >
                        {pf.titulo}
                      </p>
                      <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                        <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "12px", color: "var(--color-text-muted)" }}>
                          {formatearFechaCorta(pf.fecha, true)}
                        </span>
                        <span
                          style={{
                            padding: "3px 10px",
                            border: `1px solid ${dias <= 7 ? "var(--color-stamp)" : "var(--color-gold-dim)"}`,
                            fontFamily: "var(--font-ibm-plex-mono)",
                            fontSize: "10px",
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: dias <= 7 ? "var(--color-stamp)" : "var(--color-gold)",
                          }}
                        >
                          {countdownLabel(dias)}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Toggle de la lista completa */}
                <button
                  onClick={() => setFechasAbiertas((v) => !v)}
                  className="flex items-center justify-center gap-2 w-full"
                  style={{
                    marginTop: "16px",
                    padding: "10px 0",
                    borderTop: "1px solid var(--color-line-soft)",
                    borderLeft: "none",
                    borderRight: "none",
                    borderBottom: "none",
                    background: "none",
                    cursor: "pointer",
                    fontFamily: "var(--font-ibm-plex-mono)",
                    fontSize: "9px",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--color-text-faint)",
                    transition: "color 0.2s ease",
                  }}
                  aria-expanded={fechasAbiertas}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-gold)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-faint)")}
                >
                  {fechasAbiertas ? "Ocultar calendario" : `Ver todas (${materia.fechas.length})`}
                  <ChevronDown
                    style={{
                      width: "12px",
                      height: "12px",
                      flexShrink: 0,
                      transform: fechasAbiertas ? "rotate(180deg)" : "none",
                      transition: "transform 0.2s ease",
                    }}
                  />
                </button>

                {/* Lista completa */}
                {fechasAbiertas && (
                  <div className="pt-1">
                    <div className="space-y-0.5">
                      {materia.fechas.map((f) => {
                        const dias = diasHasta(f.fecha);
                        const pasada = dias < 0;
                        return (
                          <div
                            key={f.id}
                            className="flex items-center justify-between gap-3"
                            style={{
                              padding: "9px 0",
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
                  </div>
                )}
                </div>
              </div>
              <div style={{ borderTop: "1px solid var(--color-line-soft)", marginTop: "28px" }} />
            </div>
            </div>
          )}

          {/* Clases */}
          {loading ? (
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 overflow-hidden"
              style={{ background: "var(--color-line-soft)", gap: "1px" }}
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skeleton h-52" />
              ))}
            </div>
          ) : clases.length === 0 ? (
            <div
              style={{
                padding: "80px 48px",
                textAlign: "center",
                background: "var(--color-card)",
                border: "1px solid var(--color-line-soft)",
              }}
            >
              <p style={{ color: "var(--color-text-muted)", fontSize: "15px", lineHeight: 1.7 }}>
                Todavía no hay clases publicadas en esta materia.
                <br />
                <span style={{ color: "var(--color-text-faint)", fontSize: "13px" }}>
                  Volvé más tarde, el material de cursada se publica acá.
                </span>
              </p>
            </div>
          ) : (
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {clases.map((clase, i) => (
                <article
                  key={clase.id}
                  onClick={() => {
                    trackActivity({ tipo: "class_view", pagina: "materia", materia_slug: slug, clase_id: clase.id });
                    router.push(claseHref(clase.numero));
                  }}
                  className="group card-reveal card-hover flex flex-col cursor-pointer"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      trackActivity({ tipo: "class_view", pagina: "materia", materia_slug: slug, clase_id: clase.id });
                      router.push(claseHref(clase.numero));
                    }
                  }}
                  style={{
                    background: "var(--color-card)",
                    padding: "28px 24px",
                    animationDelay: `${i * 50}ms`,
                    transition: "background 0.25s ease, transform 0.25s ease, opacity 0.25s ease, border-color 0.25s ease",
                    border: "1px solid var(--color-line-soft)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-card-hover)"; e.currentTarget.style.borderColor = "var(--color-gold-dim)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-card)"; e.currentTarget.style.borderColor = "var(--color-line-soft)"; }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-ibm-plex-mono)",
                      fontSize: "10px",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "var(--color-gold)",
                      marginBottom: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span>Clase {clase.numero.toString().padStart(2, "0")}</span>
                  </div>
                  <div className="flex-1">
                    <h3
                      style={{
                        fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                        fontWeight: 500,
                        fontSize: "20px",
                        lineHeight: 1.2,
                        color: "var(--color-text)",
                        marginBottom: "12px",
                      }}
                    >
                      {clase.tema || clase.titulo}
                    </h3>
                    {clase.tema && clase.titulo && (
                      <p
                        style={{
                          fontFamily: "var(--font-ibm-plex-mono)",
                          fontSize: "10px",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: "var(--color-text-faint)",
                          marginTop: "-6px",
                          marginBottom: "12px",
                        }}
                      >
                        {clase.titulo}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {clase.fecha ? (
                        <div
                          className="flex items-center gap-2"
                          style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "11px", color: "var(--color-text-faint)" }}
                        >
                          <Calendar style={{ width: "14px", height: "14px" }} />
                          {formatFechaLocal(clase.fecha)}
                        </div>
                      ) : (
                        <div />
                      )}
                      {clase.archivos.length > 0 && (
                        <div className="flex items-center gap-2" style={{ color: "var(--color-text-muted)" }}>
                          {tieneRecurso(clase, "audio_clase") && <Headphones style={{ width: "12px", height: "12px" }} />}
                          {tieneRecurso(clase, "clase_youtube") && <Play style={{ width: "12px", height: "12px" }} />}
                          {tieneRecurso(clase, "transcripcion") && <FileText style={{ width: "12px", height: "12px" }} />}
                          {tieneRecurso(clase, "podcast") && <Volume2 style={{ width: "12px", height: "12px" }} />}
                          {(tieneRecurso(clase, "archivo") || tieneRecurso(clase, "enlace")) && (
                            <Link2 style={{ width: "12px", height: "12px" }} />
                          )}
                        </div>
                      )}
                    </div>
                    <ArrowRight style={{ width: "16px", height: "16px", color: "var(--color-gold)", flexShrink: 0 }} />
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Podcasts se ven dentro de cada card de clase */}
          {null}

          {/* Enlaces útiles de la materia */}
          {!loading && enlaces.length > 0 && (
            <section style={{ marginTop: "56px" }}>
              <div className="flex items-center gap-3 mb-6">
                <Link2 style={{ width: "16px", height: "16px", color: "var(--color-gold)" }} />
                <h2 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif", fontWeight: 400, fontSize: "24px" }}>
                  Enlaces útiles
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enlaces.map((e, i) => (
                  <article
                    key={e.id}
                    onClick={() => router.push(claseHref(e.clase.numero))}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); router.push(claseHref(e.clase.numero)); } }}
                    className="card-reveal card-hover flex items-center gap-4 cursor-pointer focus-visible"
                    style={{ background: "var(--color-card)", padding: "20px 22px", animationDelay: `${i * 45}ms`, transition: "background 0.25s ease, transform 0.25s ease, opacity 0.25s ease, border-color 0.25s ease", border: "1px solid var(--color-line-soft)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-card-hover)"; e.currentTarget.style.borderColor = "var(--color-gold-dim)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-card)"; e.currentTarget.style.borderColor = "var(--color-line-soft)"; }}
                  >
                    <div
                      className="flex items-center justify-center flex-shrink-0"
                      style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1px solid var(--color-gold-dim)" }}
                    >
                      <Link2 style={{ width: "14px", height: "14px", color: "var(--color-gold)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        style={{
                          fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                          fontWeight: 500,
                          fontSize: "15px",
                          color: "var(--color-text)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {e.nombre_display}
                      </p>
                      <p style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", color: "var(--color-gold)" }}>
                        Clase {e.clase.numero.toString().padStart(2, "0")}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
