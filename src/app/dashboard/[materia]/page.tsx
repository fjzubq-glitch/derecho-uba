"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trackActivity } from "@/lib/tracking";
import { ArrowLeft, Calendar, Headphones, FileText, Play, ExternalLink, Shield } from "@/components/icons";
import { formatDuration } from "@/lib/utils";

interface Archivo {
  id: string;
  tipo: string;
  nombre_display: string;
  storage_key: string | null;
  youtube_url: string | null;
  contenido_texto: string | null;
  duration_seconds: number | null;
  play_count: number;
}

interface Clase {
  id: string;
  numero: number;
  titulo: string;
  fecha: string;
  archivos: Archivo[];
}

const TIPO_ICONS: Record<string, React.ReactNode> = {
  audio_clase: <Headphones className="w-4 h-4" />,
  podcast: <Play className="w-4 h-4" />,
  transcripcion: <FileText className="w-4 h-4" />,
  youtube: <ExternalLink className="w-4 h-4" />,
};

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
                  {/* Header de la clase */}
                  <div className="flex items-start justify-between mb-6 pb-6 border-b" style={{ borderColor: "var(--color-line-soft)" }}>
                    <div>
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
                      <h3
                        style={{
                          fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                          fontWeight: 500,
                          fontSize: "22px",
                          lineHeight: 1.2,
                          color: "var(--color-text)",
                        }}
                      >
                        {clase.titulo}
                      </h3>
                    </div>
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

                  {/* Archivos */}
                  <div className="space-y-3">
                    {clase.archivos.map((archivo) => {
                      const isYouTube = archivo.tipo === "youtube" || archivo.youtube_url;

                      return (
                        <button
                          key={archivo.id}
                          onClick={() => {
                            if (isYouTube && archivo.youtube_url) {
                              window.open(archivo.youtube_url, "_blank");
                              trackActivity({ tipo: "youtube_open", pagina: "materia", materia_slug: slug, archivo_id: archivo.id });
                            } else {
                              router.push(`/dashboard/${slug}/${clase.id}`);
                            }
                          }}
                          className="w-full flex items-center gap-4 p-4 border-t"
                          style={{
                            borderColor: "var(--color-line-soft)",
                            borderRadius: 0,
                            transition: "background 0.2s ease",
                            textAlign: "left",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <div
                            className="flex items-center justify-center flex-shrink-0"
                            style={{
                              width: "40px",
                              height: "40px",
                              borderRadius: "50%",
                              border: "1px solid var(--color-line)",
                            }}
                          >
                            {isYouTube ? (
                              <ExternalLink style={{ width: "16px", height: "16px", color: "var(--color-gold)" }} />
                            ) : (
                              TIPO_ICONS[archivo.tipo] || <Headphones style={{ width: "16px", height: "16px", color: "var(--color-gold)" }} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              style={{
                                fontSize: "14px",
                                fontWeight: 500,
                                color: "var(--color-text)",
                                marginBottom: "4px",
                              }}
                            >
                              {archivo.nombre_display}
                            </p>
                            <div className="flex items-center gap-4">
                              {archivo.duration_seconds && (
                                <span
                                  style={{
                                    fontFamily: "var(--font-ibm-plex-mono)",
                                    fontSize: "11px",
                                    color: "var(--color-text-faint)",
                                  }}
                                >
                                  {formatDuration(archivo.duration_seconds)}
                                </span>
                              )}
                              <span
                                style={{
                                  fontFamily: "var(--font-ibm-plex-mono)",
                                  fontSize: "11px",
                                  color: "var(--color-text-faint)",
                                }}
                              >
                                {archivo.play_count} reproducciones
                              </span>
                            </div>
                          </div>
                          {isYouTube ? (
                            <ExternalLink style={{ width: "16px", height: "16px", color: "var(--color-gold)" }} />
                          ) : (
                            <ArrowLeft style={{ width: "16px", height: "16px", color: "var(--color-gold)", transform: "rotate(180deg)" }} />
                          )}
                        </button>
                      );
                    })}
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
