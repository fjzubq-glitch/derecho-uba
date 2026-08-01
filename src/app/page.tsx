"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import PortalHeader from "@/components/PortalHeader";
import PortalFooter from "@/components/PortalFooter";
import { ArrowRight, Clock, Headphones, FileText, Volume2, Link2, Grid, Mic } from "@/components/icons";
import { formatDuration, formatFechaLocal } from "@/lib/utils";

interface Materia {
  id: string;
  nombre: string;
  slug: string;
  total_clases: number;
  total_audios: number;
}

interface Reciente {
  id: string;
  numero: number;
  titulo: string;
  fecha: string | null;
  materia_nombre: string;
  materia_slug: string;
  tiene_audio: boolean;
  tiene_transcripcion: boolean;
  tiene_podcast: boolean;
  tiene_archivo: boolean;
}

interface Podcast {
  id: string;
  nombre: string;
  duration_seconds: number | null;
  clase_titulo: string;
  clase_numero: number | null;
  materia_slug: string;
  materia_nombre: string;
}

const splitName = (n: string) => {
  const p = n.split(",");
  return { title: p[0]?.trim() || n, meta: p.slice(1).map((s) => s.trim()).join(", ") || null };
};

export default function HomePage() {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [recientes, setRecientes] = useState<Reciente[]>([]);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/materias").then((r) => r.json()),
      fetch("/api/recientes").then((r) => r.json()),
      fetch("/api/podcasts").then((r) => r.json()),
    ])
      .then(([m, r, p]) => {
        if (m.materias) setMaterias(m.materias);
        if (r.recientes) setRecientes(r.recientes);
        if (p.podcasts) setPodcasts(p.podcasts);
      })
      .catch((e) => console.error("Error cargando home:", e))
      .finally(() => setLoading(false));
  }, []);

  const recursoIcons = (r: Reciente) => {
    const items: { key: string; icon: React.ReactNode; label: string }[] = [];
    if (r.tiene_audio) items.push({ key: "audio", icon: <Headphones style={{ width: "12px", height: "12px" }} />, label: "Audio" });
    if (r.tiene_transcripcion) items.push({ key: "transc", icon: <FileText style={{ width: "12px", height: "12px" }} />, label: "Transcripción" });
    if (r.tiene_podcast) items.push({ key: "pod", icon: <Volume2 style={{ width: "12px", height: "12px" }} />, label: "Podcast" });
    if (r.tiene_archivo) items.push({ key: "arch", icon: <Link2 style={{ width: "12px", height: "12px" }} />, label: "Material" });
    return items;
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-ink)" }}>
      <PortalHeader />

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden border-b" style={{ borderColor: "var(--color-line-soft)" }}>
        <div className="relative z-10 pad-lateral" style={{ padding: "52px 48px 44px" }}>
          <svg
            className="absolute pointer-events-none hidden sm:block"
            style={{
              right: "-40px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "340px",
              height: "340px",
              opacity: "0.035",
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
              fontSize: "clamp(34px, 4vw, 50px)",
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
              maxWidth: "680px",
            }}
          >
            Clases, transcripciones y podcasts <br className="hidden sm:block" />
            organizados por <span style={{ fontStyle: "italic", color: "var(--color-gold)", fontWeight: 300 }}>materia</span>.
          </h1>

          <p className="mt-6 hero-sub" style={{ maxWidth: "520px", fontSize: "15px", lineHeight: 1.7 }}>
            Accedé a grabaciones, transcripciones, archivos y enlaces clave por clase.
            Material de estudio curado y ordenado para estudiantes de Derecho UBA.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-8">
            <Link
              href="/dashboard"
              style={{
                background: "var(--color-gold)",
                color: "var(--color-ink)",
                padding: "15px 32px",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
                lineHeight: 1,
                transition: "background 0.2s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-gold-dim)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-gold)")}
            >
              Ver materias
              <ArrowRight style={{ width: "15px", height: "15px" }} />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ MATERIAS DESTACADAS ═══════════ */}
      <section className="flex-1">
        <div className="pad-lateral" style={{ padding: "40px 48px 56px" }}>
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
                      <Grid style={{ width: "16px", height: "16px" }} />
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

      {/* ═══════════ ÚLTIMAS CLASES SUBIDAS ═══════════ */}
      <section className="border-t" style={{ borderColor: "var(--color-line-soft)" }}>
        <div className="pad-lateral" style={{ padding: "40px 48px 48px" }}>
          <h2 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif", fontWeight: 400, fontSize: "24px", marginBottom: "8px" }}>
            Últimas clases subidas
          </h2>
          <p className="hero-sub mb-8" style={{ fontSize: "13px", lineHeight: 1.6, maxWidth: "480px" }}>
            Contenido reciente de cursada, listo para escuchar, leer o descargar.
          </p>

          {recientes.length === 0 ? (
            <p style={{ color: "var(--color-text-faint)", fontSize: "14px" }}>Todavía no hay clases publicadas.</p>
          ) : (
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 overflow-hidden"
              style={{ background: "var(--color-line-soft)", gap: "1px" }}
            >
              {recientes.map((r) => (
                <Link
                  key={r.id}
                  href={r.materia_slug ? `/dashboard/${r.materia_slug}/clase/${r.numero}` : "/dashboard"}
                  className="group flex flex-col"
                  style={{
                    background: "var(--color-card)",
                    padding: "24px 22px",
                    textDecoration: "none",
                    transition: "background 0.25s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-card-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-card)")}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-ibm-plex-mono)",
                      fontSize: "10px",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--color-gold)",
                      marginBottom: "8px",
                    }}
                  >
                    {r.materia_nombre}
                  </div>
                  <h3
                    className="flex-1 mb-4"
                    style={{
                      fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                      fontWeight: 500,
                      fontSize: "18px",
                      lineHeight: 1.3,
                      color: "var(--color-text)",
                    }}
                  >
                    {r.titulo}
                  </h3>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2" style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", color: "var(--color-text-faint)" }}>
                      {r.fecha && (
                        <>
                          <Clock style={{ width: "12px", height: "12px" }} />
                          {formatFechaLocal(r.fecha, { month: "short" })}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2" style={{ color: "var(--color-text-muted)" }}>
                      {recursoIcons(r).slice(0, 2).map((it) => (
                        <span key={it.key} title={it.label} style={{ display: "inline-flex" }}>
                          {it.icon}
                        </span>
                      ))}
                      {recursoIcons(r).length > 2 && (
                        <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", color: "var(--color-text-faint)" }}>
                          +{recursoIcons(r).length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════ PODCASTS RECIENTES ═══════════ */}
      <section className="border-t" style={{ borderColor: "var(--color-line-soft)" }}>
        <div className="pad-lateral" style={{ padding: "40px 48px 64px" }}>
          <div className="flex items-center gap-3 mb-8">
            <Mic style={{ width: "18px", height: "18px", color: "var(--color-gold)" }} />
            <h2 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif", fontWeight: 400, fontSize: "24px" }}>
              Podcasts recientes
            </h2>
          </div>

          {podcasts.length === 0 ? (
            <p style={{ color: "var(--color-text-faint)", fontSize: "14px" }}>Todavía no hay podcasts publicados.</p>
          ) : (
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 overflow-hidden"
              style={{ background: "var(--color-line-soft)", gap: "1px" }}
            >
              {podcasts.map((p) => (
                <Link
                  key={p.id}
                  href={p.materia_slug && p.clase_numero ? `/dashboard/${p.materia_slug}/clase/${p.clase_numero}` : "/dashboard"}
                  className="group flex items-center gap-4"
                  style={{
                    background: "var(--color-card)",
                    padding: "22px 24px",
                    textDecoration: "none",
                    transition: "background 0.25s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-card-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-card)")}
                >
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      border: "1px solid var(--color-gold-dim)",
                    }}
                  >
                    <Volume2 style={{ width: "16px", height: "16px", color: "var(--color-gold)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      style={{
                        fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                        fontWeight: 500,
                        fontSize: "16px",
                        lineHeight: 1.3,
                        color: "var(--color-text)",
                        marginBottom: "3px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.nombre}
                    </h3>
                    <p style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", color: "var(--color-text-faint)" }}>
                      {p.materia_nombre}
                      {p.duration_seconds ? ` · ${formatDuration(p.duration_seconds)}` : ""}
                    </p>
                  </div>
                  <ArrowRight style={{ width: "14px", height: "14px", color: "var(--color-gold)", flexShrink: 0 }} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <PortalFooter />
    </div>
  );
}
