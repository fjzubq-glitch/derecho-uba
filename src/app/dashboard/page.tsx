"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { trackActivity } from "@/lib/tracking";
import { Scale, Shield, ArrowRight } from "@/components/icons";

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

          return {
            ...m,
            total_clases: totalClases || 0,
            total_audios: totalAudios,
            total_reproducciones: totalRep,
          };
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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Bar */}
      <header
        className="flex items-center justify-between px-6 sm:px-12 py-5 border-b"
        style={{
          borderColor: "var(--color-line-soft)",
          background: "linear-gradient(180deg, var(--color-ink-2), var(--color-ink))",
        }}
      >
        <div className="flex items-center gap-3.5">
          <div
            className="w-[34px] h-[34px] flex items-center justify-center rounded-full border shrink-0"
            style={{ borderColor: "var(--color-gold-dim)" }}
          >
            <Scale className="w-4 h-4" style={{ color: "var(--color-gold)" }} />
          </div>
          <div className="leading-tight">
            <div style={{ fontFamily: "var(--font-fraunces)", fontWeight: 500, fontSize: "18px", letterSpacing: "0.01em" }}>
              Derecho <span style={{ color: "var(--color-gold)", fontWeight: 400 }}>UBA</span>
            </div>
            <div
              className="mt-0.5"
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "10px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--color-text-faint)",
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
            letterSpacing: "0.05em",
          }}
        >
          {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          <br />
          Sesión — Admin
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative px-6 sm:px-12 py-14 sm:py-20 overflow-hidden border-b"
        style={{ borderColor: "var(--color-line-soft)" }}
      >
        <svg
          className="absolute right-[-40px] top-[-60px] w-[420px] h-[420px] opacity-[0.035] pointer-events-none"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-gold)"
          strokeWidth="0.4"
        >
          <path d="M12 2 L12 22 M6 6 L18 6 M4 6 L4 12 A4 4 0 0 0 8 6 M20 6 L20 12 A4 4 0 0 1 16 6 M7 20 L17 20" />
        </svg>

        <div
          className="flex items-center gap-2.5 mb-4"
          style={{
            fontFamily: "var(--font-ibm-plex-mono)",
            fontSize: "11px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--color-gold)",
          }}
        >
          <span className="w-[22px] h-px inline-block" style={{ background: "var(--color-gold-dim)" }} />
          Panel de materias
        </div>

        <h1
          style={{
            fontFamily: "var(--font-fraunces)",
            fontWeight: 400,
            fontSize: "clamp(40px, 5vw, 58px)",
            lineHeight: 1.05,
            letterSpacing: "-0.01em",
            maxWidth: "720px",
          }}
        >
          Tus clases, ordenadas con{" "}
          <span style={{ fontStyle: "italic", color: "var(--color-gold)", fontWeight: 300 }}>criterio</span>{" "}
          de estudio.
        </h1>

        <p
          className="mt-5"
          style={{
            maxWidth: "480px",
            color: "var(--color-text-muted)",
            fontSize: "15px",
            lineHeight: 1.6,
          }}
        >
          Seleccioná una materia para gestionar clases, audios y transcripciones.
        </p>

        <div
          className="flex gap-14 mt-13 pt-8 border-t"
          style={{
            borderColor: "var(--color-line-soft)",
            maxWidth: "560px",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "30px",
                fontWeight: 500,
                color: "var(--color-gold)",
                lineHeight: 1,
              }}
            >
              {String(stats.clases).padStart(2, "0")}
            </div>
            <div
              className="mt-2"
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "10px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--color-text-faint)",
              }}
            >
              Clases cargadas
            </div>
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "30px",
                fontWeight: 500,
                lineHeight: 1,
              }}
            >
              {String(stats.audios).padStart(2, "0")}
            </div>
            <div
              className="mt-2"
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "10px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--color-text-faint)",
              }}
            >
              Audios
            </div>
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "30px",
                fontWeight: 500,
                lineHeight: 1,
              }}
            >
              {String(stats.reproducciones).padStart(2, "0")}
            </div>
            <div
              className="mt-2"
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "10px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--color-text-faint)",
              }}
            >
              Reproducciones
            </div>
          </div>
        </div>
      </section>

      {/* Materias Grid */}
      <section className="px-6 sm:px-12 py-16 flex-1">
        <div className="flex items-baseline justify-between mb-9 flex-wrap gap-3">
          <div style={{ fontFamily: "var(--font-fraunces)", fontWeight: 400, fontSize: "26px" }}>
            Mis materias
          </div>
          <div
            style={{
              fontFamily: "var(--font-ibm-plex-mono)",
              fontSize: "11px",
              color: "var(--color-text-faint)",
              letterSpacing: "0.08em",
            }}
          >
            {materias.length} materias activas
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px" style={{ background: "var(--color-line-soft)", border: "1px solid var(--color-line-soft)" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72" style={{ background: "var(--color-card)" }} />
            ))}
          </div>
        ) : (
          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-px"
            style={{ background: "var(--color-line-soft)", border: "1px solid var(--color-line-soft)" }}
          >
            {materias.map((m) => {
              const { title, meta } = getMateriaName(m.nombre);
              const isEmpty = m.total_clases === 0;

              return (
                <article
                  key={m.id}
                  onClick={() => router.push(`/dashboard/${m.slug}`)}
                  className="flex flex-col cursor-pointer transition-colors duration-200"
                  style={{
                    background: "var(--color-card)",
                    padding: "32px 30px",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-card-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-card)")}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div
                      className="w-[38px] h-[38px] rounded-full flex items-center justify-center border transition-colors duration-200"
                      style={{ borderColor: isEmpty ? "var(--color-line)" : "var(--color-line)" }}
                    >
                      <Shield
                        className="w-4 h-4"
                        style={{ color: "var(--color-gold)", opacity: isEmpty ? 0.4 : 0.85 }}
                      />
                    </div>
                    <div className="text-right">
                      <div
                        style={{
                          fontFamily: "var(--font-ibm-plex-mono)",
                          fontSize: "22px",
                          fontWeight: 500,
                        }}
                      >
                        {m.total_clases}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-ibm-plex-mono)",
                          fontSize: "9px",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: "var(--color-text-faint)",
                          marginTop: "2px",
                        }}
                      >
                        Clases
                      </div>
                    </div>
                  </div>

                  <h3
                    style={{
                      fontFamily: "var(--font-fraunces)",
                      fontWeight: 500,
                      fontSize: "20px",
                      marginBottom: "6px",
                      color: isEmpty ? "var(--color-text-muted)" : "inherit",
                    }}
                  >
                    {title}
                  </h3>

                  <div
                    style={{
                      fontFamily: "var(--font-ibm-plex-mono)",
                      fontSize: "11px",
                      color: "var(--color-text-faint)",
                      letterSpacing: "0.02em",
                      marginBottom: "24px",
                    }}
                  >
                    {meta || "Sin comisión asignada"}
                  </div>

                  <div
                    className="flex flex-col gap-2.5 mb-7 pt-5 border-t"
                    style={{ borderColor: "var(--color-line-soft)" }}
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

                  <div
                    className="mt-auto inline-flex items-center gap-2 w-fit"
                    style={{ fontSize: "13px", color: "var(--color-gold)", fontWeight: 500 }}
                  >
                    Ver contenido
                    <ArrowRight className="w-[13px] h-[13px] transition-transform duration-200 group-hover:translate-x-0.5" />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer
        className="flex items-center justify-between px-6 sm:px-12 py-7 border-t"
        style={{
          borderColor: "var(--color-line-soft)",
          fontFamily: "var(--font-ibm-plex-mono)",
          fontSize: "10px",
          letterSpacing: "0.08em",
          color: "var(--color-text-faint)",
          textTransform: "uppercase",
        }}
      >
        <span>Derecho UBA — Sistema de gestión de clases</span>
        <span>v0.1</span>
      </footer>
    </div>
  );
}
