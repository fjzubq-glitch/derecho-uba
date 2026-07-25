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
    const { data: materiasData } = await supabase.from("materias").select("*").order("nombre");

    if (materiasData) {
      const materiasConStats = await Promise.all(
        materiasData.map(async (m) => {
          const { count: totalClases } = await supabase
            .from("clases").select("*", { count: "exact", head: true }).eq("materia_id", m.id);

          const { data: clasesIds } = await supabase
            .from("clases").select("id").eq("materia_id", m.id);

          const claseIds = clasesIds?.map((c) => c.id) || [];
          let totalAudios = 0;
          let totalRep = 0;

          if (claseIds.length > 0) {
            const { count } = await supabase
              .from("archivos").select("*", { count: "exact", head: true }).in("clase_id", claseIds);
            totalAudios = count || 0;
            const { data: archivos } = await supabase
              .from("archivos").select("play_count").in("clase_id", claseIds);
            totalRep = archivos?.reduce((sum, a) => sum + (a.play_count || 0), 0) || 0;
          }

          return { ...m, total_clases: totalClases || 0, total_audios: totalAudios, total_reproducciones: totalRep };
        })
      );
      setMaterias(materiasConStats);
      setStats({
        clases: materiasConStats.reduce((s, m) => s + m.total_clases, 0),
        audios: materiasConStats.reduce((s, m) => s + m.total_audios, 0),
        reproducciones: materiasConStats.reduce((s, m) => s + m.total_reproducciones, 0),
      });
    }
    setLoading(false);
  }

  const splitName = (n: string) => {
    const p = n.split(",");
    return { title: p[0]?.trim() || n, meta: p.slice(1).map((s) => s.trim()).join(", ") || null };
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-ink)" }}>
      {/* ════════ HEADER ════════ */}
      <header
        className="border-b"
        style={{ borderColor: "var(--color-line-soft)", background: "linear-gradient(180deg, var(--color-ink-2) 0%, var(--color-ink) 100%)" }}
      >
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-8 sm:px-12 py-6">
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 flex items-center justify-center rounded-full border"
              style={{ borderColor: "var(--color-gold-dim)" }}
            >
              <Shield className="w-[17px] h-[17px]" style={{ color: "var(--color-gold)" }} />
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-fraunces)", fontWeight: 500, fontSize: "20px", lineHeight: 1.2 }}>
                Derecho <span style={{ color: "var(--color-gold)" }}>UBA</span>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-ibm-plex-mono)",
                  fontSize: "10px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--color-text-faint)",
                  marginTop: "3px",
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
              color: "var(--color-text-faint)",
              letterSpacing: "0.04em",
              lineHeight: 1.7,
            }}
          >
            {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            <br />
            Sesión admin
          </div>
        </div>
      </header>

      {/* ════════ HERO ════════ */}
      <section className="relative overflow-hidden border-b" style={{ borderColor: "var(--color-line-soft)" }}>
        <div className="max-w-[1200px] mx-auto px-8 sm:px-12 pt-20 sm:pt-28 pb-16 sm:pb-20 relative">
          {/* Watermark */}
          <svg
            className="absolute right-0 top-1/2 -translate-y-1/2 w-[360px] h-[360px] opacity-[0.025] pointer-events-none hidden sm:block"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-gold)"
            strokeWidth="0.4"
          >
            <path d="M12 2 L4 6 L4 12 C4 17 7.5 20.5 12 22 C16.5 20.5 20 17 20 12 L20 6 Z" />
            <path d="M12 8 L12 16 M9 11 L15 11" />
          </svg>

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
            <span className="w-6 h-px" style={{ background: "var(--color-gold-dim)" }} />
            Panel de materias
          </div>

          <h1
            style={{
              fontFamily: "var(--font-fraunces)",
              fontWeight: 400,
              fontSize: "clamp(38px, 5vw, 60px)",
              lineHeight: 1.06,
              letterSpacing: "-0.02em",
              maxWidth: "700px",
            }}
          >
            Tus clases, ordenadas{" "}
            <br className="hidden sm:block" />
            con <span style={{ fontStyle: "italic", color: "var(--color-gold)", fontWeight: 300 }}>criterio</span>{" "}
            de estudio.
          </h1>

          <p
            className="mt-7"
            style={{
              maxWidth: "440px",
              color: "var(--color-text-muted)",
              fontSize: "15px",
              lineHeight: 1.7,
            }}
          >
            Accedé a tus materias, audios y transcripciones de forma rápida y ordenada.
          </p>

          {/* Stats */}
          <div
            className="flex gap-20 mt-16 pt-8 border-t"
            style={{ borderColor: "var(--color-line-soft)", maxWidth: "560px" }}
          >
            {[
              { value: stats.clases, label: "Clases", accent: true },
              { value: stats.audios, label: "Audios" },
              { value: stats.reproducciones, label: "Reproduc." },
            ].map((s) => (
              <div key={s.label}>
                <div
                  style={{
                    fontFamily: "var(--font-ibm-plex-mono)",
                    fontSize: "36px",
                    fontWeight: 500,
                    lineHeight: 1,
                    color: s.accent ? "var(--color-gold)" : "var(--color-text-main)",
                  }}
                >
                  {String(s.value).padStart(2, "0")}
                </div>
                <div
                  className="mt-3"
                  style={{
                    fontFamily: "var(--font-ibm-plex-mono)",
                    fontSize: "10px",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--color-text-faint)",
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ MATERIAS ════════ */}
      <section className="flex-1">
        <div className="max-w-[1200px] mx-auto px-8 sm:px-12 py-20">
          <div className="flex items-baseline justify-between mb-12 flex-wrap gap-4">
            <h2 style={{ fontFamily: "var(--font-fraunces)", fontWeight: 400, fontSize: "28px" }}>
              Mis materias
            </h2>
            <span
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "11px",
                color: "var(--color-text-faint)",
                letterSpacing: "0.08em",
              }}
            >
              {materias.length} activas
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-80 rounded-lg" style={{ background: "var(--color-card)" }} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {materias.map((m) => {
                const { title, meta } = splitName(m.nombre);
                const isEmpty = m.total_clases === 0;

                return (
                  <article
                    key={m.id}
                    onClick={() => router.push(`/dashboard/${m.slug}`)}
                    className="group flex flex-col cursor-pointer rounded-lg border"
                    style={{
                      background: "var(--color-card)",
                      borderColor: "var(--color-line-soft)",
                      padding: "36px 32px 32px",
                      transition: "all 0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--color-card-hover)";
                      e.currentTarget.style.borderColor = "var(--color-gold-dim)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "var(--color-card)";
                      e.currentTarget.style.borderColor = "var(--color-line-soft)";
                    }}
                  >
                    {/* Top */}
                    <div className="flex items-start justify-between mb-8">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center border"
                        style={{ borderColor: isEmpty ? "var(--color-line)" : "var(--color-gold-dim)" }}
                      >
                        <Shield
                          className="w-[18px] h-[18px]"
                          style={{ color: "var(--color-gold)", opacity: isEmpty ? 0.3 : 0.75 }}
                        />
                      </div>
                      <div className="text-right">
                        <div
                          style={{
                            fontFamily: "var(--font-ibm-plex-mono)",
                            fontSize: "28px",
                            fontWeight: 500,
                            lineHeight: 1,
                            color: isEmpty ? "var(--color-text-faint)" : "var(--color-text-main)",
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
                        fontFamily: "var(--font-fraunces)",
                        fontWeight: 500,
                        fontSize: "22px",
                        lineHeight: 1.2,
                        color: isEmpty ? "var(--color-text-muted)" : "var(--color-text-main)",
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
                        marginBottom: "28px",
                      }}
                    >
                      {meta || "Sin comisión asignada"}
                    </div>

                    {/* Divider + Stats */}
                    <div
                      className="flex flex-col gap-3 mb-auto pt-6 border-t"
                      style={{ borderColor: "var(--color-line-soft)" }}
                    >
                      <div className="flex items-center justify-between" style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
                        <span>Archivos</span>
                        <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "13px", color: "var(--color-text-main)" }}>
                          {m.total_audios}
                        </span>
                      </div>
                      <div className="flex items-center justify-between" style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
                        <span>Reproducciones</span>
                        <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "13px", color: "var(--color-text-main)" }}>
                          {m.total_reproducciones}
                        </span>
                      </div>
                    </div>

                    {/* CTA */}
                    <div
                      className="flex items-center gap-2 mt-8 pt-5 border-t"
                      style={{ borderColor: "var(--color-line-soft)", fontSize: "13px", color: "var(--color-gold)", fontWeight: 500 }}
                    >
                      Ver contenido
                      <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer
        className="border-t"
        style={{ borderColor: "var(--color-line-soft)" }}
      >
        <div
          className="max-w-[1200px] mx-auto flex items-center justify-between px-8 sm:px-12 py-6"
          style={{
            fontFamily: "var(--font-ibm-plex-mono)",
            fontSize: "10px",
            letterSpacing: "0.08em",
            color: "var(--color-text-faint)",
            textTransform: "uppercase",
          }}
        >
          <span>Derecho UBA — Sistema de gestión</span>
          <span>v0.1</span>
        </div>
      </footer>
    </div>
  );
}
