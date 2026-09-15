"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PortalHeader from "@/components/PortalHeader";
import WelcomeGate from "@/components/WelcomeGate";
import InkStamp from "@/components/InkStamp";
import { trackActivity } from "@/lib/tracking";
import { formatFechaLocal, isAdminSession } from "@/lib/utils";
import { diasHasta, countdownLabel, formatearFechaCorta } from "@/lib/fechas";
import { ArrowLeft, ArrowRight, Calendar, Headphones, FileText, Link2, Play, ExternalLink, BookOpen } from "@/components/icons";

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
  created_at?: string;
  archivos: Archivo[];
}

function esNuevaClase(created_at?: string): boolean {
  if (!created_at) return false;
  const created = new Date(created_at).getTime();
  return Date.now() - created < 24 * 60 * 60 * 1000 && Date.now() >= created;
}

interface MateriaData {
  id: string;
  nombre: string;
  estado?: string;
  tutor_url?: string | null;
  fechas?: Array<{ id: string; titulo: string; fecha: string }>;
}

export default function MateriaClient({
  slug,
  materia,
  clases,
  acceso,
}: {
  slug: string;
  materia: MateriaData | null;
  clases: Clase[];
  acceso?: { clave: string | null; nombre: string | null };
}) {
  const router = useRouter();
  const [showTutorModal, setShowTutorModal] = useState(false);

  useEffect(() => {
    trackActivity({ tipo: "page_view", pagina: "materia", materia_slug: slug });
  }, [slug]);

  const splitName = (n: string) => {
    const p = n.split(",");
    return { title: p[0]?.trim() || n, meta: p.slice(1).map((s) => s.trim()).join(", ") || null };
  };

  const { title: materiaTitle, meta: materiaMeta } = materia ? splitName(materia.nombre) : { title: "", meta: null };

  const tieneRecurso = (c: Clase, tipo: string) => c.archivos.some((a) => a.tipo === tipo);

  const enlaces = useMemo(() =>
    clases.flatMap((c) =>
      c.archivos.filter((a) => a.tipo === "enlace").map((a) => ({ ...a, clase: c }))
    ),
  [clases]);

  const claseHref = (numero: number) => {
    const base = `/dashboard/${slug}/clase/${numero}`;
    if (acceso?.clave && acceso.nombre) {
      return `${base}?clave=${encodeURIComponent(acceso.clave)}&nombre=${encodeURIComponent(acceso.nombre)}`;
    }
    return base;
  };

  const calendarioHref = () => {
    const base = `/dashboard/${slug}/calendario`;
    if (acceso?.clave && acceso.nombre) {
      return `${base}?clave=${encodeURIComponent(acceso.clave)}&nombre=${encodeURIComponent(acceso.nombre)}`;
    }
    return base;
  };

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
                  fontSize: "var(--text-page)",
                  lineHeight: 1.08,
                  letterSpacing: "-0.02em",
                  maxWidth: "760px",
                  overflowWrap: "break-word",
                  textWrap: "balance",
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
              {clases.length > 0 && (
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
                    <span className="clase-num" style={{ color: "var(--color-stamp)" }}>{clases.length}</span>{" "}
                    clases
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
          {/* ═══════════ FECHAS + TUTOR (3 columnas) ═══════════ */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Fechas importantes */}
            {materia?.fechas && materia.fechas.length > 0 && (
              <article
                role="link"
                tabIndex={0}
                onClick={() => router.push(calendarioHref())}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(calendarioHref());
                  }
                }}
                className="cursor-pointer card-reveal card-hover h-full"
                style={{
                  background: "var(--color-card)",
                  padding: "28px 24px",
                  border: "1px solid var(--color-line-soft)",
                  borderRadius: "var(--radius-card)",
                  transition: "background 0.25s ease, border-color 0.25s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-card-hover)"; e.currentTarget.style.borderColor = "var(--color-gold-dim)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-card)"; e.currentTarget.style.borderColor = "var(--color-line-soft)"; }}
              >
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
                  <span
                    style={{
                      fontFamily: "var(--font-ibm-plex-mono)",
                      fontSize: "10px",
                      letterSpacing: "0.1em",
                      color: "var(--color-text-faint)",
                    }}
                  >
                    <span className="clase-num">{String(materia.fechas.length).padStart(2, "0")}</span>{" "}
                    FECHAS
                  </span>
                </div>

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

                <button
                  type="button"
                  className="flex items-center justify-center gap-2 w-full"
                  style={{
                    marginTop: "16px",
                    padding: "10px 14px",
                    border: "1px solid var(--color-gold-dim)",
                    borderRadius: "var(--radius-btn)",
                    background: "none",
                    cursor: "pointer",
                    fontFamily: "var(--font-ibm-plex-mono)",
                    fontSize: "10px",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--color-gold)",
                    transition: "background 0.2s ease, color 0.2s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-gold)"; e.currentTarget.style.color = "var(--color-ink)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--color-gold)"; }}
                >
                  Ver calendario ({materia.fechas.length})
                </button>
              </article>
            )}

            {/* Tutor Virtual */}
            {materia?.tutor_url && (
              <article
                onClick={() => setShowTutorModal(true)}
                className="card-reveal card-hover h-full cursor-pointer"
                style={{
                  background: "var(--color-card)",
                  padding: "28px 24px",
                  border: "1px solid var(--color-line-soft)",
                  borderRadius: "var(--radius-card)",
                  transition: "background 0.25s ease, border-color 0.25s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-card-hover)"; e.currentTarget.style.borderColor = "var(--color-admin-dim)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-card)"; e.currentTarget.style.borderColor = "var(--color-line-soft)"; }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-ibm-plex-mono)",
                    fontSize: "10px",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--color-admin)",
                    marginBottom: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <BookOpen style={{ width: "14px", height: "14px" }} />
                  <span>Tutor Virtual</span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      fontFamily: "var(--font-ibm-plex-mono)",
                      fontSize: "9px",
                      letterSpacing: "0.1em",
                      color: "#7FD9A8",
                      background: "rgba(93,202,165,0.08)",
                      border: "1px solid rgba(93,202,165,0.3)",
                      borderRadius: "20px",
                      padding: "2px 9px 2px 7px",
                      lineHeight: 1,
                      textTransform: "uppercase",
                    }}
                  >
                    <span
                      style={{
                        width: "5px",
                        height: "5px",
                        borderRadius: "50%",
                        background: "#5DCAA5",
                        boxShadow: "0 0 0 rgba(93,202,165,0.4)",
                        animation: "pulse-dot 2s ease-in-out infinite",
                        flexShrink: 0,
                      }}
                    />
                    NUEVO
                  </span>
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
                    Asistente de estudio
                  </h3>
                  <p
                    style={{
                      fontFamily: "var(--font-inter)",
                      fontSize: "13px",
                      color: "var(--color-text-muted)",
                      lineHeight: 1.5,
                    }}
                  >
                    Basado en las fuentes oficiales de la cátedra.
                  </p>
                </div>
                <div className="flex items-center justify-between" style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--color-line-soft)" }}>
                  <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "11px", color: "var(--color-text-muted)" }}>
                    NotebookLM
                  </span>
                  <span
                    className="flex items-center gap-2"
                    style={{
                      fontFamily: "var(--font-ibm-plex-mono)",
                      fontSize: "10px",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "var(--color-admin)",
                    }}
                  >
                    Consultar
                    <ExternalLink style={{ width: "12px", height: "12px" }} />
                  </span>
                </div>
              </article>
            )}
          </div>

          {/* Divisor sutil entre filas */}
          <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, var(--color-line-soft) 20%, var(--color-line-soft) 80%, transparent)", margin: "16px 0" }} />

          {/* ═══════════ CLASES (3 columnas) ═══════════ */}
          {clases.length === 0 ? (
            <div className="glass-card card-reveal" style={{ padding: "80px 24px", textAlign: "center", borderRadius: "var(--radius-card)" }}>
              <p style={{ color: "var(--color-text-muted)", fontSize: "15px", lineHeight: 1.7 }}>
                Todavía no hay clases publicadas en esta materia.
                <br />
                <span style={{ color: "var(--color-text-faint)", fontSize: "13px" }}>
                  Volvé más tarde, el material de cursada se publica acá.
                </span>
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clases.map((clase, i) => (
                <article
                  key={clase.id}
                  onClick={() => {
                    trackActivity({ tipo: "class_view", pagina: "materia", materia_slug: slug, clase_id: clase.id });
                    router.push(claseHref(clase.numero));
                  }}
                  className="group card-reveal card-hover flex flex-col cursor-pointer h-full"
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
                    transition: "background 0.25s ease, border-color 0.25s ease",
                    border: "1px solid var(--color-line-soft)",
                    borderRadius: "var(--radius-card)",
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
                    {esNuevaClase(clase.created_at) && (
                      <span
                        style={{
                          padding: "2px 6px",
                          background: "rgba(76,175,125,0.1)",
                          border: "1px solid rgba(76,175,125,0.35)",
                          color: "var(--color-admin)",
                          boxShadow: "0 0 8px rgba(76,175,125,0.18)",
                          fontSize: "8px",
                          letterSpacing: "0.1em",
                          fontWeight: 700,
                        }}
                      >
                        NEW
                      </span>
                    )}
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
          {enlaces.length > 0 && (
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
                    style={{ background: "var(--color-card)", padding: "20px 22px", animationDelay: `${i * 45}ms`, transition: "background 0.25s ease, transform 0.25s ease, opacity 0.25s ease, border-color 0.25s ease", border: "1px solid var(--color-line-soft)", borderRadius: "var(--radius-card)" }}
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

      {/* Modal Tutor Virtual */}
      {showTutorModal && materia?.tutor_url && (
        <div
          onClick={() => setShowTutorModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            padding: "24px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--color-card)",
              border: "1px solid var(--color-line-soft)",
              borderRadius: "var(--radius-card)",
              maxWidth: "580px",
              width: "100%",
              padding: "28px 28px 24px",
            }}
          >
            <p style={{ fontSize: "20px", marginBottom: "12px" }}>👋</p>
            <h2
              style={{
                fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                fontWeight: 500,
                fontSize: "17px",
                color: "var(--color-text)",
                lineHeight: 1.3,
                marginBottom: "4px",
              }}
            >
              ¡Bienvenido/a a tu Asistente Virtual de Estudio!
            </h2>
            <p
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "10px",
                color: "var(--color-text-muted)",
                letterSpacing: "0.04em",
                marginBottom: "18px",
              }}
            >
              Derecho Comercial — Cátedra Favier Dubois · Luchinsky | Com. 8722, UBA
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "18px" }}>
              <div>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text)", marginBottom: "2px" }}>🤖 ¿Qué es?</p>
                <p style={{ fontSize: "12px", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                  Tu tutor de IA entrenado exclusivamente con el material de la cátedra. ¡No inventa respuestas!
                </p>
              </div>
              <div>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text)", marginBottom: "2px" }}>📚 Fuentes</p>
                <p style={{ fontSize: "12px", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                  Manual de Favier Dubois, Informes de clase, Cronograma y Leyes del programa.
                </p>
              </div>
              <div>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text)", marginBottom: "2px" }}>💡 ¿Para qué sirve?</p>
                <p style={{ fontSize: "12px", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                  Repasar temas, aclarar dudas y contrastar doctrina. Te dará pistas para que aprendas, pero no te redactará la solución final de los casos.
                </p>
              </div>
              <div
                style={{
                  background: "rgba(185,154,98,0.06)",
                  border: "1px solid rgba(185,154,98,0.15)",
                  borderRadius: "8px",
                  padding: "10px 12px",
                }}
              >
                <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-gold)", marginBottom: "2px" }}>📌 Aviso Académico</p>
                <p style={{ fontSize: "11px", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                  Esta herramienta es un complemento para tu estudio; su objetivo es ayudarte a organizar y repasar los temas, pero no reemplaza la asistencia a clases, la lectura integral del Manual ni el asesoramiento legal profesional. Recordá que la IA puede cometer errores o desactualizarse: contrastá siempre esta información con los materiales y fuentes oficiales de la cátedra.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowTutorModal(false);
                window.open(materia!.tutor_url!, "_blank", "noopener,noreferrer");
              }}
              style={{
                width: "100%",
                height: "40px",
                borderRadius: "8px",
                background: "var(--color-gold)",
                border: "none",
                color: "var(--color-ink)",
                fontFamily: "var(--font-inter)",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                transition: "background 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-gold-dim)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-gold)")}
            >
              Aceptar y continuar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
