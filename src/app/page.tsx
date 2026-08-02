"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PortalHeader from "@/components/PortalHeader";
import PortalFooter from "@/components/PortalFooter";
import { trackActivity } from "@/lib/tracking";
import { Shield, ArrowRight } from "@/components/icons";


interface Materia {
  id: string;
  nombre: string;
  slug: string;
  total_clases: number;
  clase_ids?: string[];
}

export default function HomePage() {
  const router = useRouter();
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMaterias();
    trackActivity({ tipo: "page_view", pagina: "home" });
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

  const splitName = (n: string) => {
    const p = n.split(",");
    return { title: p[0]?.trim() || n, meta: p.slice(1).map((s) => s.trim()).join(", ") || null };
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-ink)" }}>

      <PortalHeader hideCta />

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden border-b" style={{ borderColor: "var(--color-line-soft)" }}>
        <div className="relative z-10 pad-lateral hero-pad" style={{ padding: "72px 48px 48px" }}>

          {/* Watermark — 420px, opacity 0.035, stroke-width 1.1 — Balanza de la justicia */}
          <svg
            className="absolute pointer-events-none hidden sm:block"
            style={{
              right: "-40px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "420px",
              height: "420px",
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

          {/* Title */}
          <h1
            style={{
              fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
              fontWeight: 400,
              fontSize: "clamp(40px, 5vw, 62px)",
              lineHeight: 1.06,
              letterSpacing: "-0.02em",
              maxWidth: "720px",
            }}
          >
            Todo el material de clase,{" "}
            <br className="hidden sm:block" />
            en un <span style={{ fontStyle: "italic", color: "var(--color-gold)", fontWeight: 300 }}>solo lugar</span>.
          </h1>

          {/* Description */}
          <p
            className="mt-8 hero-sub"
            style={{
              maxWidth: "500px",
              fontSize: "15px",
              lineHeight: 1.8,
              letterSpacing: "0.01em",
              color: "var(--color-text-muted)",
            }}
          >
            Entrá a una materia para consultar clases, transcripciones, podcasts, archivos y enlaces clave de cursada.
          </p>

        </div>
      </section>

      {/* ═══════════ MATERIAS ═══════════ */}
      <section className="flex-1">
        <div className="pad-lateral" style={{ padding: "48px 48px 80px" }}>
          <div className="flex items-baseline justify-between mb-8 flex-wrap gap-4">
            <h2 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif", fontWeight: 400, fontSize: "28px" }}>
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
                <div key={i} className="h-80" style={{ background: "var(--color-card)", borderRadius: 0 }} />
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
              <p style={{ color: "var(--color-text-muted)", fontSize: "15px" }}>
                Todavía no hay materias publicadas.
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
              {materias.map((m) => {
                const { title, meta } = splitName(m.nombre);
                const isEmpty = m.total_clases === 0;

                return (
                  <article
                    key={m.id}
                    onClick={() => router.push(`/dashboard/${m.slug}`)}
                    className="group flex flex-col cursor-pointer"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/dashboard/${m.slug}`); }}
                    style={{
                      background: "var(--color-card)",
                      padding: "32px 30px",
                      borderRadius: 0,
                      transition: "background 0.25s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-card-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-card)")}
                  >
                    {/* Top: icon + count */}
                    <div className="flex items-start justify-between mb-8">
                      <div
                        className="flex items-center justify-center"
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "50%",
                          border: `1px solid ${isEmpty ? "var(--color-line)" : "var(--color-gold-dim)"}`,
                          transition: "border-color 0.25s ease",
                        }}
                      >
                        <Shield
                          style={{
                            width: "15px",
                            height: "15px",
                            color: "var(--color-gold)",
                            opacity: isEmpty ? 0.3 : 0.75,
                          }}
                        />
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
                        fontSize: "22px",
                        lineHeight: 1.2,
                        color: isEmpty ? "var(--color-text-muted)" : "var(--color-text)",
                      }}
                    >
                      {title}
                    </h3>

                    {/* Meta */}
                    <div
                      style={{
                        fontFamily: "var(--font-ibm-plex-mono)",
                        fontSize: "12px",
                        color: "var(--color-text-faint)",
                        letterSpacing: "0.01em",
                        marginBottom: "20px",
                      }}
                    >
                      {meta || "Sin comisión asignada"}
                    </div>

                    {/* CTA */}
                    <div
                      className="flex items-center gap-2 mt-8 pt-5 border-t card-link"
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
