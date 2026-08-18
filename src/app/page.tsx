"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PortalHeader from "@/components/PortalHeader";
import PortalFooter from "@/components/PortalFooter";
import InkStamp from "@/components/InkStamp";
import { Shield, ArrowRight, Headphones, FileText, Play, Volume2 } from "@/components/icons";

interface Materia {
  id: string;
  nombre: string;
  slug: string;
  comision: string | null;
  catedra: string | null;
  anio: string | null;
  turno: string | null;
  total_clases: number;
  clase_ids?: string[];
}

interface ItemContinuar {
  tipo: string;
  archivo_id: string;
  nombre_display: string;
  clase_numero: number | null;
  clase_titulo: string;
  materia_slug: string;
  materia_nombre: string;
  created_at: string;
}

export default function HomePage() {
  const router = useRouter();
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [loading, setLoading] = useState(true);
  const [continuar, setContinuar] = useState<ItemContinuar[]>([]);
  const [stampTapped, setStampTapped] = useState<number | null>(null);
  const stampTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (stampTimer.current) clearTimeout(stampTimer.current);
    };
  }, []);

  function isTouchDevice() {
    return typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;
  }

  function abrirMateria(m: Materia, index: number) {
    if (isTouchDevice()) {
      setStampTapped(index);
      if (stampTimer.current) clearTimeout(stampTimer.current);
      stampTimer.current = setTimeout(() => {
        router.push(`/dashboard/${m.slug}`);
      }, 450);
    } else {
      router.push(`/dashboard/${m.slug}`);
    }
  }

  useEffect(() => {
    loadMaterias();
  }, []);

  useEffect(() => {
    async function loadContinuar() {
      try {
        const res = await fetch("/api/continuar");
        const data = await res.json();
        if (data.items) setContinuar(data.items);
      } catch {
        // Silencioso: no debe romper la home
      }
    }
    loadContinuar();
  }, []);

  async function loadMaterias() {
    try {
      const res = await fetch("/api/materias");
      const data = await res.json();
      if (data.materias) {
        setMaterias(data.materias);
      }
    } catch (e) {
      console.error("Error loading materias:", e);
    }
    setLoading(false);
  }

  function iconoContinuar(tipo: string) {
    if (tipo === "transcription_view") return <FileText style={{ width: "13px", height: "13px" }} />;
    if (tipo === "youtube_open") return <Play style={{ width: "13px", height: "13px" }} />;
    return <Headphones style={{ width: "13px", height: "13px" }} />;
  }

  function tiempoRelativo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "recién";
    if (min < 60) return `hace ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.floor(h / 24);
    return d === 1 ? "ayer" : `hace ${d} días`;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-ink)" }}>

      <PortalHeader hideCta />

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden border-b" style={{ borderColor: "var(--color-line-soft)" }}>
        <div className="relative z-10 pad-lateral hero-pad" style={{ padding: "72px 48px 64px" }}>

          {/* Watermark — 420px, opacity 0.035, stroke-width 1.1 — Balanza de la justicia */}
          <svg
            aria-hidden="true"
            focusable="false"
            className="absolute pointer-events-none"
            style={{
              right: "-40px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "min(420px, 50vw)",
              height: "min(420px, 50vw)",
              opacity: "0.035",
            }}
            viewBox="0 0 100 100"
            fill="none"
            stroke="var(--color-gold)"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Columna central */}
            <line x1="50" y1="18" x2="50" y2="82" />
            {/* Base */}
            <line x1="35" y1="82" x2="65" y2="82" />
            <line x1="40" y1="85" x2="60" y2="85" />
            {/* Viga superior */}
            <line x1="20" y1="30" x2="80" y2="30" />
            {/* Círculo decorativo superior */}
            <circle cx="50" cy="22" r="4" />
            {/* Cuerda izquierda + plato */}
            <line x1="20" y1="30" x2="15" y2="55" />
            <line x1="20" y1="30" x2="25" y2="55" />
            <path d="M10 55 Q15 62 20 55 Q25 62 30 55" />
            {/* Cuerda derecha + plato */}
            <line x1="80" y1="30" x2="75" y2="55" />
            <line x1="80" y1="30" x2="85" y2="55" />
            <path d="M70 55 Q75 62 80 55 Q85 62 90 55" />
          </svg>

          {/* Eyebrow */}
          <div
            className="flex items-center gap-3 mb-8"
            style={{
              fontFamily: "var(--font-ibm-plex-mono)",
              fontSize: "11px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--color-gold)",
            }}
          >
            <span style={{ width: "24px", height: "1px", background: "var(--color-gold-dim)" }} />
            Biblioteca de cursada
          </div>

          {/* Carátula: título a la izquierda, sello a la derecha */}
          <div className="flex items-start justify-between gap-10">
            <div>
              <h1
                style={{
                  fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                  fontWeight: 400,
                  fontSize: "var(--text-display)",
                  lineHeight: 1.06,
                  letterSpacing: "-0.02em",
                  maxWidth: "720px",
                }}
              >
                Todo el material de clase,{" "}
                <br className="hidden sm:block" />
                en un <span style={{ fontStyle: "italic", color: "var(--color-gold)", fontWeight: 300 }}>solo lugar</span>.
              </h1>

              {/* Anotación a máquina */}
              <p className="annotation mt-8" style={{ maxWidth: "460px", lineHeight: 1.7 }}>
                — Materiales del cuatrimestre en curso, audio y video de las clases, Lexpodcast, transcripciones y más, <span style={{ color: "var(--color-stamp)" }}>foliados por materia.</span> —
              </p>
            </div>

            {/* Sello de la carátula */}
            <div className="hidden md:block flex-shrink-0" style={{ paddingTop: "6px" }}>
              <div className="hero-stamp">
                <InkStamp
                  size={200}
                  titulo="BIBLIOTECA DE CURSADA"
                  subtitulo="FACULTAD DE DERECHO · UBA"
                  rotate={-9}
                />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ═══════════ CONTINUAR ESTUDIANDO ═══════════ */}
      {continuar.length > 0 && (
        <section>
          <div className="pad-lateral" style={{ padding: "36px 48px 0" }}>
            <div
              style={{
                background: "var(--color-card)",
                border: "1px solid var(--color-line-soft)",
                borderRadius: 0,
                padding: "22px 26px",
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Volume2 style={{ width: "13px", height: "13px", color: "var(--color-gold)" }} />
                <span
                  style={{
                    fontFamily: "var(--font-ibm-plex-mono)",
                    fontSize: "10px",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "var(--color-gold)",
                  }}
                >
                  Continuar estudiando
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-1">
                {continuar.map((item) => (
                  <button
                    key={item.archivo_id}
                    onClick={() => {
                      if (item.materia_slug && item.clase_numero != null) {
                        router.push(`/dashboard/${item.materia_slug}/clase/${item.clase_numero}`);
                      }
                    }}
                    className="flex items-center gap-3 text-left flex-1 min-w-0"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: item.materia_slug && item.clase_numero != null ? "pointer" : "default",
                      padding: "10px 14px",
                      borderLeft: "1px solid var(--color-line-soft)",
                      transition: "background 0.2s ease",
                      flexBasis: item.materia_slug && item.clase_numero != null ? "46%" : "auto",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-card-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span className="flex items-center justify-center flex-shrink-0" style={{ width: "30px", height: "30px", borderRadius: "50%", border: "1px solid var(--color-gold-dim)", color: "var(--color-gold)" }}>
                      {iconoContinuar(item.tipo)}
                    </span>
                    <span className="min-w-0">
                      <span
                        className="block"
                        style={{
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "var(--color-text)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.nombre_display}
                      </span>
                      <span
                        className="block"
                        style={{
                          fontFamily: "var(--font-ibm-plex-mono)",
                          fontSize: "9px",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--color-text-faint)",
                          marginTop: "2px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.materia_nombre}
                        {item.clase_numero != null ? ` · Clase ${String(item.clase_numero).padStart(2, "0")}` : ""}
                      </span>
                    </span>
                    <span
                      className="ml-auto flex-shrink-0"
                      style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", color: "var(--color-text-faint)" }}
                    >
                      {tiempoRelativo(item.created_at)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════ MATERIAS ═══════════ */}
      <section className="flex-1">
        <div className="pad-lateral" style={{ padding: "48px 48px 80px" }}>
          <div className="flex items-baseline justify-between mb-8 flex-wrap gap-4">
            <h2 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif", fontWeight: 400, fontSize: "var(--text-title)" }}>
              Mis materias
            </h2>
            <span
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "11px",
                color: "var(--color-text-faint)",
              }}
            >
              {materias.length} materias publicadas
            </span>
          </div>

          {loading ? (
            <div
              className="grid grid-cols-1 md:grid-cols-3 overflow-hidden"
              style={{
                background: "var(--color-line-soft)",
                gap: "1px",
                borderRadius: 0,
              }}
            >
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-80" />
              ))}
            </div>
          ) : materias.length === 0 ? (
            <div
              style={{
                padding: "80px 24px",
                textAlign: "center",
                background: "var(--color-card)",
                border: "1px solid var(--color-line-soft)",
                borderRadius: 0,
              }}
            >
              <p style={{ color: "var(--color-text-muted)", fontSize: "15px", lineHeight: 1.7 }}>
                Todavía no hay materias publicadas.
                <br />
                <span style={{ color: "var(--color-text-faint)", fontSize: "13px" }}>
                  Volvé más tarde, o avisale al administrador del portal.
                </span>
              </p>
            </div>
          ) : (
            <div
              className="grid grid-cols-1 md:grid-cols-3 overflow-hidden"
              style={{
                background: "var(--color-line-soft)",
                gap: "1px",
                borderRadius: 0,
              }}
            >
              {materias.map((m, i) => {
                const isEmpty = m.total_clases === 0;
                const metaLine = [m.anio && `Año ${m.anio}`, m.comision && `Comisión ${m.comision}`, m.turno, m.catedra].filter(Boolean).join(" · ");

                return (
                  <article
                    key={m.id}
                    onClick={() => abrirMateria(m, i)}
                    className={`group card-reveal card-hover card-stamp flex flex-col cursor-pointer${stampTapped === i ? " stamp-shown" : ""}`}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        if (e.key === " ") e.preventDefault();
                        abrirMateria(m, i);
                      }
                    }}
                    style={{
                      background: "var(--color-card)",
                      padding: "28px 26px",
                      borderRadius: 0,
                      animationDelay: `${i * 60}ms`,
                      transition: "background 0.25s ease, transform 0.25s ease, opacity 0.25s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-card-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-card)")}
                  >
                    {/* Top: icon + folio + count */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex items-center justify-center"
                          style={{
                            width: "38px",
                            height: "38px",
                            borderRadius: "50%",
                            border: `1px solid ${isEmpty ? "var(--color-line)" : "var(--color-gold-dim)"}`,
                            transition: "border-color 0.25s ease",
                          }}
                        >
                          <Shield
                            style={{
                              width: "17px",
                              height: "17px",
                              color: "var(--color-gold)",
                              opacity: isEmpty ? 0.3 : 0.75,
                            }}
                          />
                        </div>
                        <span className="folio">
                          Clase{" "}
                          <span className="folio-num">
                            {String(i + 1).padStart(2, "0")}/{String(materias.length).padStart(2, "0")}
                          </span>
                        </span>
                      </div>
                      <div className="text-right">
                        <div
                          style={{
                            fontFamily: "var(--font-ibm-plex-mono)",
                            fontSize: "28px",
                            fontWeight: 500,
                            lineHeight: 1,
                            color: isEmpty ? "var(--color-text-faint)" : "var(--color-text)",
                          }}
                        >
                          {m.total_clases}
                        </div>
                        <div
                          className="mt-1"
                          style={{
                            fontFamily: "var(--font-ibm-plex-mono)",
                            fontSize: "9px",
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            color: "var(--color-text-faint)",
                          }}
                        >
                          Clases
                        </div>
                      </div>
                    </div>

                    {/* Title */}
                    <h3
                      className="mb-2"
                      style={{
                        fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                        fontWeight: 500,
                        fontSize: "18px",
                        lineHeight: 1.3,
                        color: isEmpty ? "var(--color-text-muted)" : "var(--color-text)",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {m.nombre}
                    </h3>

                    {/* Meta */}
                    <div
                      style={{
                        fontFamily: "var(--font-ibm-plex-mono)",
                        fontSize: "12px",
                        color: "var(--color-text-faint)",
                        letterSpacing: "0.01em",
                        marginBottom: "20px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {metaLine || "Sin datos de cursada"}
                    </div>

                    {/* CTA */}
                    <div
                      className="flex items-center gap-2 mt-auto pt-4 border-t card-link"
                      style={{ borderColor: "var(--color-line-soft)", fontSize: "13px", fontWeight: 500 }}
                    >
                      Ver contenido
                      <ArrowRight
                        style={{
                          width: "14px",
                          height: "14px",
                          transition: "transform 0.2s ease",
                        }}
                        className="group-hover:translate-x-[3px]"
                      />
                    </div>

                    {/* Sello que se estampa al hover */}
                    <div className="stamp-reveal">
                      <InkStamp
                        size={96}
                        titulo="MATERIAL"
                        subtitulo="DE CURSADA"
                        rotate={-12}
                        style={{ mixBlendMode: "screen" }}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <PortalFooter />
    </div>
  );
}
