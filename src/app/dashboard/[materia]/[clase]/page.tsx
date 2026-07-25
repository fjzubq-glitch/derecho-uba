"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { trackActivity } from "@/lib/tracking";
import AudioPlayer from "@/components/AudioPlayer";
import { ArrowLeft, Calendar, Play, ExternalLink, Headphones, FileText } from "@/components/icons";
import { formatDuration, getYouTubeThumbnail } from "@/lib/utils";

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

export default function ClaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const materiaSlug = params.materia as string;
  const claseId = params.clase as string;

  const [clase, setClase] = useState<{
    id: string;
    numero: number;
    titulo: string;
    fecha: string | null;
    archivos: Archivo[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [playingAudio, setPlayingAudio] = useState<{ src: string; title: string; archivoId: string } | null>(null);

  useEffect(() => {
    if (claseId) {
      loadClase();
      trackActivity({ tipo: "page_view", pagina: "clase", materia_slug: materiaSlug, clase_id: claseId });
    }
  }, [claseId]);

  async function loadClase() {
    const { data: claseData } = await supabase
      .from("clases")
      .select(`
        id, 
        numero, 
        titulo, 
        fecha,
        archivos (
          id,
          tipo,
          nombre_display,
          storage_key,
          youtube_url,
          contenido_texto,
          duration_seconds,
          play_count
        )
      `)
      .eq("id", claseId)
      .single();

    if (claseData) {
      setClase(claseData);
    }
    setLoading(false);
  }

  async function playAudio(archivo: Archivo) {
    if (archivo.youtube_url) {
      window.open(archivo.youtube_url, "_blank");
      trackActivity({ tipo: "youtube_open", pagina: "clase", materia_slug: materiaSlug, clase_id: claseId, archivo_id: archivo.id });
      return;
    }

    const res = await fetch(`/api/stream/${archivo.id}`);
    const data = await res.json();

    if (data.url) {
      setPlayingAudio({ src: data.url, title: archivo.nombre_display, archivoId: archivo.id });

      await supabase.rpc("increment_play_count", { file_id: archivo.id });
      trackActivity({ tipo: "play_start", pagina: "clase", materia_slug: materiaSlug, clase_id: claseId, archivo_id: archivo.id });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--color-ink)" }}>
        <div
          className="animate-spin"
          style={{
            width: "48px",
            height: "48px",
            border: "2px solid var(--color-line)",
            borderTopColor: "var(--color-gold)",
            borderRadius: "50%",
          }}
        />
      </div>
    );
  }

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
            onClick={() => router.push(`/dashboard/${materiaSlug}`)}
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
            <div
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "10px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--color-gold)",
                marginBottom: "4px",
              }}
            >
              Clase {clase?.numero.toString().padStart(2, "0")}
            </div>
            <h1
              style={{
                fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                fontWeight: 500,
                fontSize: "20px",
                lineHeight: 1.2,
                color: "var(--color-text)",
              }}
            >
              {clase?.titulo}
            </h1>
          </div>
        </div>
      </header>

      {/* ═══════════ MAIN ═══════════ */}
      <main className="flex-1">
        <div className="pad-lateral" style={{ padding: "60px 48px 120px" }}>
          {/* Info de la clase */}
          <div
            style={{
              padding: "32px 30px",
              background: "var(--color-card)",
              border: "1px solid var(--color-line-soft)",
              borderRadius: 0,
              marginBottom: "40px",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                fontWeight: 400,
                fontSize: "28px",
                lineHeight: 1.2,
                color: "var(--color-text)",
                marginBottom: "12px",
              }}
            >
              {clase?.titulo}
            </h2>
            {clase?.fecha && (
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
                  month: "long",
                  year: "numeric",
                })}
              </div>
            )}
          </div>

          {/* Archivos */}
          <div className="space-y-4">
            {clase?.archivos.map((archivo) => {
              const isYouTube = archivo.tipo === "youtube" || archivo.youtube_url;
              const isTranscription = archivo.tipo === "transcripcion";

              return (
                <article
                  key={archivo.id}
                  style={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-line-soft)",
                    padding: "28px 26px",
                    borderRadius: 0,
                    transition: "background 0.25s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-card-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-card)")}
                >
                  {/* Header del archivo */}
                  <div className="flex items-center justify-between mb-4">
                    <div
                      style={{
                        fontFamily: "var(--font-ibm-plex-mono)",
                        fontSize: "9px",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "var(--color-gold)",
                        padding: "4px 8px",
                        border: "1px solid var(--color-gold-dim)",
                        borderRadius: 0,
                      }}
                    >
                      {archivo.tipo.replace("_", " ")}
                    </div>
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

                  {/* Thumbnail YouTube */}
                  {isYouTube && archivo.youtube_url && (
                    <a
                      href={archivo.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mb-5 group"
                      onClick={() => trackActivity({ tipo: "youtube_open", pagina: "clase", materia_slug: materiaSlug, clase_id: claseId, archivo_id: archivo.id })}
                    >
                      <div
                        className="relative overflow-hidden border max-w-xl"
                        style={{
                          borderColor: "var(--color-line)",
                          borderRadius: 0,
                        }}
                      >
                        <img
                          src={getYouTubeThumbnail(archivo.youtube_url) || "/placeholder-youtube.png"}
                          alt={archivo.nombre_display}
                          className="w-full aspect-video object-cover"
                          style={{ opacity: 0.8, transition: "opacity 0.25s ease" }}
                          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.8")}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div
                            style={{
                              width: "64px",
                              height: "64px",
                              borderRadius: "50%",
                              background: "rgba(185, 154, 98, 0.9)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "transform 0.2s ease",
                            }}
                            className="group-hover:scale-110"
                          >
                            <Play style={{ width: "28px", height: "28px", color: "var(--color-ink)", marginLeft: "3px" }} fill="var(--color-ink)" />
                          </div>
                        </div>
                      </div>
                    </a>
                  )}

                  {/* Botón de reproducción */}
                  <button
                    onClick={() => playAudio(archivo)}
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
                      className="flex items-center justify-center"
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        border: "1px solid var(--color-gold-dim)",
                      }}
                    >
                      {isYouTube ? (
                        <ExternalLink style={{ width: "18px", height: "18px", color: "var(--color-gold)" }} />
                      ) : isTranscription ? (
                        <FileText style={{ width: "18px", height: "18px", color: "var(--color-gold)" }} />
                      ) : (
                        <Headphones style={{ width: "18px", height: "18px", color: "var(--color-gold)" }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        style={{
                          fontSize: "15px",
                          fontWeight: 500,
                          color: "var(--color-text)",
                          marginBottom: "4px",
                        }}
                      >
                        {archivo.nombre_display}
                      </p>
                      {archivo.duration_seconds && (
                        <p
                          style={{
                            fontFamily: "var(--font-ibm-plex-mono)",
                            fontSize: "11px",
                            color: "var(--color-text-faint)",
                          }}
                        >
                          {formatDuration(archivo.duration_seconds)}
                        </p>
                      )}
                    </div>
                    <Play style={{ width: "16px", height: "16px", color: "var(--color-gold)" }} />
                  </button>

                  {/* Transcripción */}
                  {isTranscription && !isYouTube && archivo.contenido_texto && (
                    <div className="mt-4 border-t" style={{ borderColor: "var(--color-line-soft)", paddingTop: "16px" }}>
                      <details
                        className="group"
                        onToggle={(e) => {
                          if ((e.target as HTMLDetailsElement).open) {
                            trackActivity({ tipo: "transcription_view", pagina: "clase", materia_slug: materiaSlug, clase_id: claseId, archivo_id: archivo.id });
                          }
                        }}
                      >
                        <summary
                          className="flex items-center cursor-pointer"
                          style={{
                            fontSize: "13px",
                            color: "var(--color-text-muted)",
                            listStyle: "none",
                          }}
                        >
                          <FileText style={{ width: "14px", height: "14px", marginRight: "8px" }} />
                          Ver transcripción completa
                        </summary>
                        <div
                          style={{
                            marginTop: "12px",
                            padding: "16px",
                            background: "rgba(0,0,0,0.2)",
                            fontSize: "13px",
                            color: "var(--color-text-muted)",
                            lineHeight: 1.7,
                            whiteSpace: "pre-wrap",
                            borderRadius: 0,
                          }}
                        >
                          {archivo.contenido_texto}
                        </div>
                      </details>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </main>

      {/* ═══════════ AUDIO PLAYER ═══════════ */}
      {playingAudio && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 border-t pad-lateral"
          style={{
            padding: "20px 48px",
            background: "rgba(10, 13, 22, 0.95)",
            backdropFilter: "blur(12px)",
            borderColor: "var(--color-line-soft)",
          }}
        >
          <AudioPlayer
            src={playingAudio.src}
            title={playingAudio.title}
            onClose={() => setPlayingAudio(null)}
          />
        </div>
      )}

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
