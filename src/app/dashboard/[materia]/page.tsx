"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trackActivity } from "@/lib/tracking";
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
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    height: "180px",
                    background: "var(--color-card)",
                    borderRadius: 0,
                  }}
                />
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
            <div className="space-y-6">
              {clases.map((clase) => (
                <article
                  key={clase.id}
                  style={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-line-soft)",
                    padding: "32px 30px",
                    borderRadius: 0,
                    transition: "background 0.25s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-card-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-card)")}
                >
                  <button
                    onClick={() => {
                      trackActivity({ tipo: "class_view", pagina: "materia", materia_slug: slug, clase_id: clase.id });
                      router.push(`/dashboard/${slug}/clase/${clase.numero}`);
                    }}
                    className="w-full flex items-center justify-between"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      padding: 0,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--font-ibm-plex-mono)",
                          fontSize: "10px",
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          color: "var(--color-gold)",
                          marginBottom: "6px",
                        }}
                      >
                        Clase {clase.numero.toString().padStart(2, "0")}
                      </div>
                      <h3
                        style={{
                          fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                          fontWeight: 500,
                          fontSize: "22px",
                          lineHeight: 1.2,
                          color: "var(--color-text)",
                          marginBottom: "4px",
                        }}
                      >
                        {clase.titulo}
                      </h3>
                      {clase.fecha && (
                        <div
                          className="flex items-center gap-2"
                          style={{
                            fontFamily: "var(--font-ibm-plex-mono)",
                            fontSize: "11px",
                            color: "var(--color-text-faint)",
                          }}
                        >
                          <Calendar style={{ width: "14px", height: "14px" }} />
                          {new Date(clase.fecha).toLocaleDateString("es-AR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      )}
                    </div>
                    <ArrowRight style={{ width: "18px", height: "18px", color: "var(--color-gold)", flexShrink: 0 }} />
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t" style={{ borderColor: "var(--color-line-soft)" }}>
        <div
          className="flex items-center justify-between pad-lateral"
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
          <span>v0.2 — Prototipo</span>
        </div>
      </footer>
    </div>
  );
}
