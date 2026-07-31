"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trackActivity } from "@/lib/tracking";
import { formatFechaLocal } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Calendar } from "@/components/icons";

interface Clase {
  id: string;
  numero: number;
  titulo: string;
  fecha: string;
}



export default function MateriaPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.materia as string;

  const [materia, setMateria] = useState<{ id: string; nombre: string } | null>(null);
  const [clases, setClases] = useState<Clase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    trackActivity({ tipo: "page_view", pagina: "materia", materia_slug: slug });
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

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-ink)" }}>
      {/* ═══════════ HEADER ═══════════ */}
      <header
        className="border-b"
        style={{
          borderColor: "var(--color-line-soft)",
          background: "linear-gradient(180deg, var(--color-ink-2) 0%, var(--color-ink) 100%)",
        }}
      >
        <div className="flex items-center gap-4 pad-lateral" style={{ padding: "22px 48px" }}>
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center justify-center"
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              border: "1px solid var(--color-line)",
              color: "var(--color-gold)",
              transition: "border-color 0.25s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-gold-dim)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-line)")}
          >
            <ArrowLeft style={{ width: "15px", height: "15px" }} />
          </button>
          <div>
            <h1
              style={{
                fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                fontWeight: 500,
                fontSize: "20px",
                lineHeight: 1.2,
                color: "var(--color-text)",
              }}
            >
              {materiaTitle}
            </h1>
            {materiaMeta && (
              <div
                style={{
                  fontFamily: "var(--font-ibm-plex-mono)",
                  fontSize: "10px",
                  letterSpacing: "0.08em",
                  color: "var(--color-text-faint)",
                  marginTop: "3px",
                }}
              >
                {materiaMeta}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ═══════════ MAIN ═══════════ */}
      <main className="flex-1">
        <div className="pad-lateral" style={{ padding: "60px 48px" }}>
          {loading ? (
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 overflow-hidden"
              style={{
                background: "var(--color-line-soft)",
                gap: "1px",
                borderRadius: 0,
              }}
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-52" style={{ background: "var(--color-card)", borderRadius: 0 }} />
              ))}
            </div>
          ) : clases.length === 0 ? (
            <div
              style={{
                padding: "80px 48px",
                textAlign: "center",
                background: "var(--color-card)",
                border: "1px solid var(--color-line-soft)",
                borderRadius: 0,
              }}
            >
              <p style={{ color: "var(--color-text-muted)", fontSize: "15px" }}>
                No hay clases cargadas todavía
              </p>
            </div>
          ) : (
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 overflow-hidden"
              style={{
                background: "var(--color-line-soft)",
                gap: "1px",
                borderRadius: 0,
              }}
            >
              {clases.map((clase) => (
                <article
                  key={clase.id}
                  onClick={() => {
                    trackActivity({ tipo: "class_view", pagina: "materia", materia_slug: slug, clase_id: clase.id });
                    router.push(`/dashboard/${slug}/clase/${clase.numero}`);
                  }}
                  className="group flex flex-col cursor-pointer"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      trackActivity({ tipo: "class_view", pagina: "materia", materia_slug: slug, clase_id: clase.id });
                      router.push(`/dashboard/${slug}/clase/${clase.numero}`);
                    }
                  }}
                  style={{
                    background: "var(--color-card)",
                    padding: "28px 24px",
                    borderRadius: 0,
                    transition: "background 0.25s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-card-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-card)")}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-ibm-plex-mono)",
                      fontSize: "10px",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "var(--color-gold)",
                      marginBottom: "8px",
                    }}
                  >
                    Clase {clase.numero.toString().padStart(2, "0")}
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
                      {clase.titulo}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between">
                    {clase.fecha ? (
                      <div
                        className="flex items-center gap-2"
                        style={{
                          fontFamily: "var(--font-ibm-plex-mono)",
                          fontSize: "11px",
                          color: "var(--color-text-faint)",
                        }}
                      >
                        <Calendar style={{ width: "14px", height: "14px" }} />
                        {formatFechaLocal(clase.fecha)}
                      </div>
                    ) : (
                      <div />
                    )}
                    <ArrowRight style={{ width: "16px", height: "16px", color: "var(--color-gold)", flexShrink: 0 }} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t" style={{ borderColor: "var(--color-line-soft)" }}>
        <div
          className="footer-inner flex items-center justify-between pad-lateral"
          style={{
            padding: "28px 48px",
            fontFamily: "var(--font-ibm-plex-mono)",
            fontSize: "10px",
            letterSpacing: "0.08em",
            color: "var(--color-text-faint)",
            textTransform: "uppercase",
          }}
        >
          <span>Derecho UBA — Sistema de gestión de clases</span>
          <span>© 2026 — Designed & developed by <span style={{ color: "var(--color-gold)" }}>Franklin</span></span>
        </div>
      </footer>
    </div>
  );
}
