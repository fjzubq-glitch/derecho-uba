"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { trackActivity } from "@/lib/tracking";
import { Shield, ArrowRight } from "@/components/icons";

interface Materia {
  id: string;
  nombre: string;
  slug: string;
  total_clases: number;
  total_audios: number;
  total_reproducciones: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ clases: 0, audios: 0, reproducciones: 0 });

  useEffect(() => {
    loadMaterias();
    trackActivity({ tipo: "page_view", pagina: "dashboard" });
  }, []);

  async function loadMaterias() {
    const { data: materiasData } = await supabase
      .from("materias")
      .select("*")
      .order("nombre");

    if (materiasData) {
      const materiasConStats = await Promise.all(
        materiasData.map(async (m) => {
          const { count: totalClases } = await supabase
            .from("clases")
            .select("*", { count: "exact", head: true })
            .eq("materia_id", m.id);

          const { data: clasesIds } = await supabase
            .from("clases")
            .select("id")
            .eq("materia_id", m.id);

          const claseIds = clasesIds?.map((c) => c.id) || [];
          let totalAudios = 0;
          let totalRep = 0;

          if (claseIds.length > 0) {
            const { count } = await supabase
              .from("archivos")
              .select("*", { count: "exact", head: true })
              .in("clase_id", claseIds);
            totalAudios = count || 0;

            const { data: archivos } = await supabase
              .from("archivos")
              .select("play_count")
              .in("clase_id", claseIds);
            totalRep = archivos?.reduce((sum, a) => sum + (a.play_count || 0), 0) || 0;
          }

          return { ...m, total_clases: totalClases || 0, total_audios: totalAudios, total_reproducciones: totalRep };
        })
      );

      setMaterias(materiasConStats);
      setStats({
        clases: materiasConStats.reduce((sum, m) => sum + m.total_clases, 0),
        audios: materiasConStats.reduce((sum, m) => sum + m.total_audios, 0),
        reproducciones: materiasConStats.reduce((sum, m) => sum + m.total_reproducciones, 0),
      });
    }
    setLoading(false);
  }

  const getMateriaName = (nombre: string) => {
    const parts = nombre.split(",");
    return {
      title: parts[0]?.trim() || nombre,
      meta: parts.slice(1).map((p) => p.trim()).join(", ") || null,
    };
  };

  const statLabel = "var(--color-text-faint)";
  const lineSoft = "var(--color-line-soft)";

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── Top Bar ─── */}
      <header
        className="flex items-center justify-between px-8 sm:px-16 py-5 border-b"
        style={{ borderColor: lineSoft, background: "linear-gradient(180deg, var(--color-ink-2), var(--color-ink))" }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-9 h-9 flex items-center justify-center rounded-full border shrink-0"
            style={{ borderColor: "var(--color-gold-dim)" }}
          >
            <Shield className="w-[15px] h-[15px]" style={{ color: "var(--color-gold)" }} />
          </div>
          <div className="leading-tight">
            <div style={{ fontFamily: "var(--font-fraunces)", fontWeight: 500, fontSize: "19px" }}>
              Derecho <span style={{ color: "var(--color-gold)" }}>UBA</span>
            </div>
            <div
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "10px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: statLabel,
                marginTop: "1px",
              }}
            >
              Gestión académica
            </div>
          </div>
        </div>
        <div
          className="text-right hidden sm:block"
          style={{
            fontFamily: "var(--font-ibm-plex-mono)",
            fontSize: "11px",
            color: statLabel,
            letterSpacing: "0.04em",
            lineHeight: 1.6,
          }}
        >
          {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          <br />
          Sesión admin
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative px-8 sm:px-16 pt-16 pb-14 sm:pt-20 sm:pb-16 overflow-hidden border-b" style={{ borderColor: lineSoft }}>
        {/* Watermark */}
        <svg
          className="absolute right-8 top-1/2 -translate-y-1/2 w-[300px] h-[300px] opacity-[0.03] pointer-events-none hidden sm:block"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-gold)"
          strokeWidth="0.5"
        >
          <path d="M12 2 L4 6 L4 12 C4 17 7.5 20.5 12 22 C16.5 20.5 20 17 20 12 L20 6 Z" />
          <path d="M12 8 L12 16 M9 11 L15 11" />
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
          <span className="w-6 h-px" style={{ background: "var(--color-gold-dim)" }} />
          Panel de materias
        </div>

        <h1
          style={{
            fontFamily: "var(--font-fraunces)",
            fontWeight: 400,
            fontSize: "clamp(36px, 4.5vw, 54px)",
            lineHeight: 1.08,
            letterSpacing: "-0.015em",
            maxWidth: "680px",
          }}
        >
          Tus clases, ordenadas con{" "}
          <span style={{ fontStyle: "italic", color: "var(--color-gold)", fontWeight: 300 }}>criterio</span>{" "}
          de estudio.
        </h1>

        <p
          className="mt-6"
          style={{
            maxWidth: "460px",
            color: "var(--color-text-muted)",
            fontSize: "15px",
            lineHeight: 1.65,
          }}
        >
          Seleccioná una materia para acceder a clases, audios y transcripciones.
        </p>

        {/* Stats */}
        <div
          className="flex gap-16 mt-14 pt-8 border-t"
          style={{ borderColor: lineSoft, maxWidth: "520px" }}
        >
          {[
            { value: stats.clases, label: "Clases cargadas", accent: true },
            { value: stats.audios, label: "Audios" },
            { value: stats.reproducciones, label: "Reproducciones" },
          ].map((s) => (
            <div key={s.label}>
              <div
                style={{
                  fontFamily: "var(--font-ibm-plex-mono)",
                  fontSize: "32px",
                  fontWeight: 500,
                  lineHeight: 1,
                  color: s.accent ? "var(--color-gold)" : "var(--color-text-main)",
                }}
              >
                {String(s.value).padStart(2, "0")}
              </div>
              <div
                className="mt-2.5"
                style={{
                  fontFamily: "var(--font-ibm-plex-mono)",
                  fontSize: "9.5px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: statLabel,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Materias ─── */}
      <section className="px-8 sm:px-16 py-16 flex-1">
        <div className="flex items-baseline justify-between mb-10 flex-wrap gap-3">
          <h2 style={{ fontFamily: "var(--font-fraunces)", fontWeight: 400, fontSize: "26px" }}>
            Mis materias
          </h2>
          <span
            style={{
              fontFamily: "var(--font-ibm-plex-mono)",
              fontSize: "11px",
              color: statLabel,
              letterSpacing: "0.08em",
            }}
          >
            {materias.length} materias activas
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px rounded-sm overflow-hidden" style={{ background: lineSoft }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72" style={{ background: "var(--color-card)" }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px rounded-sm overflow-hidden" style={{ background: lineSoft }}>
            {materias.map((m) => {
              const { title, meta } = getMateriaName(m.nombre);
              const isEmpty = m.total_clases === 0;

              return (
                <article
                  key={m.id}
                  onClick={() => router.push(`/dashboard/${m.slug}`)}
                  className="group flex flex-col cursor-pointer"
                  style={{
                    background: "var(--color-card)",
                    padding: "34px 30px",
                    transition: "background 0.25s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-card-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-card)")}
                >
                  {/* Top row: icon + count */}
                  <div className="flex items-start justify-between mb-7">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center border"
                      style={{ borderColor: isEmpty ? "var(--color-line)" : "var(--color-line)" }}
                    >
                      <Shield className="w-[15px] h-[15px]" style={{ color: "var(--color-gold)", opacity: isEmpty ? 0.35 : 0.8 }} />
                    </div>
                    <div className="text-right">
                      <div
                        style={{
                          fontFamily: "var(--font-ibm-plex-mono)",
                          fontSize: "24px",
                          fontWeight: 500,
                          lineHeight: 1,
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
                          color: statLabel,
                        }}
                      >
                        Clases
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <h3
                    className="mb-1.5"
                    style={{
                      fontFamily: "var(--font-fraunces)",
                      fontWeight: 500,
                      fontSize: "20px",
                      color: isEmpty ? "var(--color-text-muted)" : "var(--color-text-main)",
                    }}
                  >
                    {title}
                  </h3>

                  {/* Meta / catedra */}
                  <div
                    className="mb-6"
                    style={{
                      fontFamily: "var(--font-ibm-plex-mono)",
                      fontSize: "11px",
                      color: "var(--color-text-faint)",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {meta || "Sin comisión asignada"}
                  </div>

                  {/* Stats row */}
                  <div
                    className="flex flex-col gap-2.5 mb-auto pt-5 border-t"
                    style={{ borderColor: lineSoft }}
                  >
                    <div className="flex items-center justify-between" style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
                      <span>Archivos</span>
                      <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "12px" }}>{m.total_audios}</span>
                    </div>
                    <div className="flex items-center justify-between" style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
                      <span>Reproducciones</span>
                      <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "12px" }}>{m.total_reproducciones}</span>
                    </div>
                  </div>

                  {/* Link */}
                  <div
                    className="flex items-center gap-2 mt-6"
                    style={{ fontSize: "13px", color: "var(--color-gold)", fontWeight: 500 }}
                  >
                    Ver contenido
                    <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── Footer ─── */}
      <footer
        className="flex items-center justify-between px-8 sm:px-16 py-6 border-t"
        style={{
          borderColor: lineSoft,
          fontFamily: "var(--font-ibm-plex-mono)",
          fontSize: "10px",
          letterSpacing: "0.08em",
          color: statLabel,
          textTransform: "uppercase",
        }}
      >
        <span>Derecho UBA — Sistema de gestión</span>
        <span>v0.1</span>
      </footer>
    </div>
  );
}
