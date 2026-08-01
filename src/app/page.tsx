"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import PortalHeader from "@/components/PortalHeader";
import PortalFooter from "@/components/PortalFooter";
import { ArrowRight, Scale } from "@/components/icons";

interface Materia {
  id: string;
  nombre: string;
  slug: string;
  total_clases: number;
  total_audios: number;
}

const splitName = (n: string) => {
  const p = n.split(",");
  return { title: p[0]?.trim() || n, meta: p.slice(1).map((s) => s.trim()).join(", ") || null };
};

export default function HomePage() {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/materias")
      .then((r) => r.json())
      .then((m) => {
        if (m.materias) setMaterias(m.materias);
      })
      .catch((e) => console.error("Error cargando home:", e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-ink)" }}>
      <PortalHeader />

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden border-b" style={{ borderColor: "var(--color-line-soft)" }}>
        <div className="relative z-10 pad-lateral" style={{ padding: "72px 48px 64px" }}>
          <svg
            className="absolute pointer-events-none hidden md:block"
            style={{
              right: "0",
              top: "50%",
              transform: "translateY(-50%)",
              width: "440px",
              height: "440px",
              opacity: "0.05",
            }}
            viewBox="0 0 100 100"
            fill="none"
            stroke="var(--color-gold)"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="50" y1="18" x2="50" y2="82" />
            <line x1="35" y1="82" x2="65" y2="82" />
            <line x1="40" y1="85" x2="60" y2="85" />
            <line x1="20" y1="30" x2="80" y2="30" />
            <circle cx="50" cy="22" r="4" />
            <line x1="20" y1="30" x2="15" y2="55" />
            <line x1="20" y1="30" x2="25" y2="55" />
            <path d="M10 55 Q15 62 20 55 Q25 62 30 55" />
            <line x1="80" y1="30" x2="75" y2="55" />
            <line x1="80" y1="30" x2="85" y2="55" />
            <path d="M70 55 Q75 62 80 55 Q85 62 90 55" />
          </svg>

          <div style={{ maxWidth: "640px" }}>
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
              Biblioteca de cursada
            </div>

            <h1
              style={{
                fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                fontWeight: 400,
                fontSize: "clamp(36px, 4.5vw, 54px)",
                lineHeight: 1.08,
                letterSpacing: "-0.02em",
              }}
            >
              Clases, transcripciones y podcasts <br className="hidden sm:block" />
              organizados por <span style={{ fontStyle: "italic", color: "var(--color-gold)", fontWeight: 300 }}>materia</span>.
            </h1>

            <p className="mt-7 hero-sub" style={{ maxWidth: "520px", fontSize: "15px", lineHeight: 1.7 }}>
              Accedé a grabaciones, transcripciones, archivos y enlaces clave por clase.
              Material de estudio curado y ordenado para estudiantes de Derecho UBA.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════ MATERIAS ═══════════ */}
      <section>
        <div className="pad-lateral" style={{ padding: "72px 48px 56px" }}>
          <div className="flex items-baseline justify-between mb-8 flex-wrap gap-4">
            <h2 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif", fontWeight: 400, fontSize: "30px" }}>
              Materias
            </h2>
            <Link
              href="/dashboard"
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "11px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--color-gold)",
                textDecoration: "none",
                transition: "opacity 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Ver todas →
            </Link>
          </div>

          {loading ? (
            <div
              className="grid grid-cols-1 md:grid-cols-3 overflow-hidden"
              style={{ background: "var(--color-line-soft)", gap: "1px" }}
            >
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64" style={{ background: "var(--color-card)" }} />
              ))}
            </div>
          ) : materias.length === 0 ? (
            <div
              style={{
                padding: "60px 24px",
                textAlign: "center",
                background: "var(--color-card)",
                border: "1px solid var(--color-line-soft)",
              }}
            >
              <p style={{ color: "var(--color-text-muted)", fontSize: "15px" }}>
                Todavía no hay materias publicadas.
              </p>
            </div>
          ) : (
            <div
              className="grid grid-cols-1 md:grid-cols-3 overflow-hidden"
              style={{ background: "var(--color-line-soft)", gap: "1px" }}
            >
              {materias.map((m) => {
                const { title, meta } = splitName(m.nombre);
                return (
                  <Link
                    key={m.id}
                    href={`/dashboard/${m.slug}`}
                    className="group flex flex-col"
                    style={{
                      background: "var(--color-card)",
                      padding: "34px 30px",
                      textDecoration: "none",
                      transition: "background 0.25s ease",
                      minHeight: "210px",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-card-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-card)")}
                  >
                    <div className="flex items-center gap-2 mb-10" style={{ color: "var(--color-gold)" }}>
                      <Scale style={{ width: "16px", height: "16px" }} />
                      <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                        {m.total_clases} clases
                      </span>
                    </div>
                    <h3
                      className="mb-2"
                      style={{
                        fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                        fontWeight: 500,
                        fontSize: "23px",
                        lineHeight: 1.25,
                        color: "var(--color-text)",
                      }}
                    >
                      {title}
                    </h3>
                    {meta && (
                      <p
                        style={{
                          fontFamily: "var(--font-ibm-plex-mono)",
                          fontSize: "11px",
                          color: "var(--color-text-faint)",
                          letterSpacing: "0.01em",
                        }}
                      >
                        {meta}
                      </p>
                    )}
                    <span
                      className="mt-auto pt-5 border-t"
                      style={{ borderColor: "var(--color-line-soft)", fontSize: "13px", fontWeight: 500, color: "var(--color-gold)" }}
                    >
                      <span className="flex items-center gap-2">
                        Abrir materia
                        <ArrowRight
                          style={{ width: "14px", height: "14px", transition: "transform 0.2s ease" }}
                          className="group-hover:translate-x-[3px]"
                        />
                      </span>
                    </span>
                  </Link>
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
