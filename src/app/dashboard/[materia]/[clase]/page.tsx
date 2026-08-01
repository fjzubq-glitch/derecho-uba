"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import PortalFooter from "@/components/PortalFooter";
import { trackActivity } from "@/lib/tracking";
import { ArrowLeft, Calendar, Play, FileText, Headphones, Pause, ExternalLink, Download, RotateCcw, Link2 } from "@/components/icons";
import { formatDuration, formatFechaLocal, saveResumeTime, getResumeTime, clearResumeTime, markVista } from "@/lib/utils";

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

const TIPO_LABELS: Record<string, string> = {
  audio_clase: "Audio de clase",
  podcast: "Podcast",
  transcripcion: "Transcripción",
  archivo: "Archivo adjunto",
  enlace: "Enlace útil",
  youtube: "YouTube",
};

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

  // Audio player state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playingSrc, setPlayingSrc] = useState<string>("");
  const [playingTitle, setPlayingTitle] = useState<string>("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [resumeNotice, setResumeNotice] = useState<string | null>(null);

  // Transcription expand
  const [openTranscription, setOpenTranscription] = useState<string | null>(null);

  useEffect(() => {
    if (claseId) {
      loadClase();
      trackActivity({ tipo: "page_view", pagina: "clase", materia_slug: materiaSlug, clase_id: claseId });
      markVista(claseId);
    }
  }, [claseId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (playingId) saveResumeTime(playingId, audio.currentTime);
    };
    const onDurationChange = () => {
      setDuration(audio.duration);
      if (playingId && Number.isFinite(audio.duration) && audio.duration > 0) {
        fetch("/api/stream/" + playingId, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ duration: Math.round(audio.duration) }),
        }).catch(() => {});
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (playingId) clearResumeTime(playingId);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
    };
  }, [playingId]);

  // Aplicar velocidad de reproducción
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate, playingId, playingSrc]);

  async function loadClase() {
    try {
      const res = await fetch(`/api/clases/${claseId}`);
      const data = await res.json();
      if (data.clase) setClase(data.clase);
    } catch (e) {
      console.error("Error loading clase:", e);
    }
    setLoading(false);
  }

  async function handlePlay(archivo: Archivo) {
    if (archivo.youtube_url) {
      window.open(archivo.youtube_url, "_blank");
      trackActivity({ tipo: "youtube_open", pagina: "clase", materia_slug: materiaSlug, clase_id: claseId, archivo_id: archivo.id });
      return;
    }

    if (playingId === archivo.id) {
      togglePlay();
      return;
    }

    setPlayingId(archivo.id);
    setPlayingSrc(`/api/stream/${archivo.id}`);
    setPlayingTitle(archivo.nombre_display);
    setCurrentTime(0);
    setDuration(archivo.duration_seconds || 0);
    setIsPlaying(true);

    const resumeAt = getResumeTime(archivo.id);
    if (resumeAt > 15 && (!archivo.duration_seconds || resumeAt < (archivo.duration_seconds - 10))) {
      setResumeNotice(archivo.nombre_display);
    } else {
      setResumeNotice(null);
    }

    fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ archivo_id: archivo.id }) }).catch(() => {});
    trackActivity({ tipo: "play_start", pagina: "clase", materia_slug: materiaSlug, clase_id: claseId, archivo_id: archivo.id });

    setTimeout(() => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.playbackRate = playbackRate;
      const resumeAt2 = getResumeTime(archivo.id);
      if (resumeAt2 > 15) {
        audio.currentTime = resumeAt2;
        setCurrentTime(resumeAt2);
      }
      audio.play();
    }, 100);
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio) return;
    const time = Number(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  }

  const SPEEDS = [1, 1.25, 1.5, 2];
  function cycleSpeed() {
    setPlaybackRate((prev) => {
      const i = SPEEDS.indexOf(prev);
      return SPEEDS[(i + 1) % SPEEDS.length];
    });
  }

  function restartFromZero() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrentTime(0);
    if (playingId) clearResumeTime(playingId);
    setResumeNotice(null);
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

  const archivos = clase?.archivos || [];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-ink)" }}>
      {/* Hidden audio element */}
      <audio ref={audioRef} src={playingSrc} preload="metadata" />

      {/* ═══════════ HEADER ═══════════ */}
      <header
        className="border-b"
        style={{
          borderColor: "var(--color-line-soft)",
          background: "linear-gradient(180deg, var(--color-ink-2) 0%, var(--color-ink) 100%)",
        }}
      >
        <div className="flex items-center justify-between gap-4 pad-lateral" style={{ padding: "22px 48px" }}>
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => router.push(`/dashboard/${materiaSlug}`)}
              className="flex items-center justify-center flex-shrink-0"
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
            <div className="min-w-0">
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
                  lineHeight: 1.25,
                  color: "var(--color-text)",
                  overflowWrap: "break-word",
                }}
              >
                {clase?.titulo}
              </h1>
            </div>
          </div>
          {clase?.fecha && (
            <div
              className="hidden sm:flex items-center gap-2"
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "11px",
                color: "var(--color-text-faint)",
              }}
            >
              <Calendar style={{ width: "14px", height: "14px" }} />
              {formatFechaLocal(clase.fecha, { month: "long" })}
            </div>
          )}
        </div>
      </header>

      {/* ═══════════ MAIN ═══════════ */}
      <main className="flex-1">
        <div className="pad-lateral" style={{ padding: "60px 48px 120px" }}>
          {/* Clase info */}
          <div style={{ marginBottom: "40px" }}>
            <h2
              style={{
                fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                fontWeight: 400,
                fontSize: "clamp(28px, 4vw, 40px)",
                lineHeight: 1.1,
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
                {formatFechaLocal(clase.fecha, { month: "long" })}
                <span style={{ color: "var(--color-line)", margin: "0 4px" }}>·</span>
                {archivos.length} archivos
              </div>
            )}
          </div>

          {/* Bloques de contenido */}
          {archivos.length === 0 ? (
            <div
              style={{
                padding: "80px 48px",
                textAlign: "center",
                background: "var(--color-card)",
                border: "1px solid var(--color-line-soft)",
              }}
            >
              <p style={{ color: "var(--color-text-faint)", fontSize: "14px" }}>
                No hay archivos cargados para esta clase
              </p>
            </div>
          ) : (
            <div
              style={{
                background: "var(--color-line-soft)",
                gap: "1px",
              }}
            >
              {archivos.map((archivo) => {
                const isAudio = archivo.tipo === "audio_clase" || archivo.tipo === "podcast";
                const isTranscription = archivo.tipo === "transcripcion";
                const isArchivo = archivo.tipo === "archivo";
                const isEnlace = archivo.tipo === "enlace";
                const linkType = isArchivo || isEnlace;
                const isYouTube = !linkType && (archivo.tipo === "youtube" || archivo.youtube_url);
                const isThisPlaying = playingId === archivo.id && isPlaying;
                const isOpen = openTranscription === archivo.id;

                const IconComponent = isTranscription ? FileText : isEnlace ? Link2 : isArchivo ? FileText : isYouTube ? ExternalLink : Headphones;

                return (
                  <article
                    key={archivo.id}
                    style={{
                      background: "var(--color-card)",
                      padding: "32px 30px",
                    }}
                  >
                    {/* Label */}
                    <div
                      style={{
                        fontFamily: "var(--font-ibm-plex-mono)",
                        fontSize: "9px",
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "var(--color-gold)",
                        marginBottom: "20px",
                      }}
                    >
                      {TIPO_LABELS[archivo.tipo] || archivo.tipo}
                    </div>

                    {/* Header del bloque */}
                    <div className="flex items-center gap-4 mb-6">
                      {/* Ícono circular hairline */}
                      <div
                        className="flex items-center justify-center flex-shrink-0"
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          border: "1px solid var(--color-gold-dim)",
                        }}
                      >
                        <IconComponent style={{ width: "16px", height: "16px", color: "var(--color-gold)" }} />
                      </div>

                      {/* Título + metadata */}
                      <div className="flex-1 min-w-0">
                        <h3
                          style={{
                            fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                            fontWeight: 500,
                            fontSize: "18px",
                            lineHeight: 1.25,
                            color: "var(--color-text)",
                            marginBottom: "4px",
                            overflowWrap: "break-word",
                          }}
                        >
                          {archivo.nombre_display}
                        </h3>
                        <div
                          className="flex items-center gap-3"
                          style={{
                            fontFamily: "var(--font-ibm-plex-mono)",
                            fontSize: "11px",
                            color: "var(--color-text-faint)",
                          }}
                        >
                          {archivo.duration_seconds && (
                            <span>{formatDuration(archivo.duration_seconds)}</span>
                          )}
                          {archivo.contenido_texto && (
                            <span>{archivo.contenido_texto.split(/\s+/).length} palabras</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Contenido del bloque */}
                    {isTranscription ? (
                      archivo.contenido_texto ? (
                        <div>
                          <button
                            onClick={() => {
                              if (isOpen) {
                                setOpenTranscription(null);
                              } else {
                                setOpenTranscription(archivo.id);
                                trackActivity({ tipo: "transcription_view", pagina: "clase", materia_slug: materiaSlug, clase_id: claseId, archivo_id: archivo.id });
                              }
                            }}
                            className="card-link"
                            style={{
                              fontSize: "13px",
                              fontWeight: 500,
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                            }}
                          >
                            {isOpen ? "Cerrar texto" : "Ver texto"}
                            <ArrowLeft style={{ width: "14px", height: "14px", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }} />
                          </button>
                          {isOpen && (
                            <div
                              style={{
                                marginTop: "16px",
                                padding: "20px",
                                background: "rgba(0,0,0,0.2)",
                                border: "1px solid var(--color-line-soft)",
                                fontSize: "14px",
                                color: "var(--color-text-muted)",
                                lineHeight: 1.8,
                                whiteSpace: "pre-wrap",
                                maxHeight: "400px",
                                overflow: "auto",
                              }}
                            >
                              {archivo.contenido_texto}
                            </div>
                          )}
                        </div>
                      ) : archivo.youtube_url ? (
                        <button
                          onClick={() => handlePlay(archivo)}
                          className="card-link"
                          style={{
                            fontSize: "13px",
                            fontWeight: 500,
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          Abrir transcripción
                          <ExternalLink style={{ width: "14px", height: "14px" }} />
                        </button>
                      ) : null
                    ) : isAudio ? (
                      /* Reproductor de audio integrado */
                      <div>
                        {/* Barra de progreso */}
                        {playingId === archivo.id && (
                          <div className="mb-4">
                            <div className="flex items-center gap-3 mb-2">
                              <button
                                onClick={togglePlay}
                                className="flex items-center justify-center flex-shrink-0"
                                style={{
                                  width: "34px",
                                  height: "34px",
                                  borderRadius: "50%",
                                  border: "1px solid var(--color-gold-dim)",
                                  background: "transparent",
                                  cursor: "pointer",
                                }}
                              >
                                {isThisPlaying ? (
                                  <Pause style={{ width: "12px", height: "12px", color: "var(--color-gold)" }} fill="var(--color-gold)" />
                                ) : (
                                  <Play style={{ width: "12px", height: "12px", color: "var(--color-gold)", marginLeft: "1px" }} fill="var(--color-gold)" />
                                )}
                              </button>
                              <input
                                type="range"
                                min={0}
                                max={duration || 0}
                                value={currentTime}
                                onChange={handleSeek}
                                style={{ flex: 1 }}
                              />
                              <span
                                style={{
                                  fontFamily: "var(--font-ibm-plex-mono)",
                                  fontSize: "11px",
                                  color: "var(--color-text-faint)",
                                  minWidth: "80px",
                                  textAlign: "right",
                                }}
                              >
                                {formatDuration(currentTime)} / {formatDuration(duration)}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              {/* Velocidad */}
                              <button
                                onClick={cycleSpeed}
                                title="Velocidad de reproducción"
                                style={{
                                  background: "none",
                                  border: "1px solid var(--color-line)",
                                  padding: "5px 10px",
                                  cursor: "pointer",
                                  fontFamily: "var(--font-ibm-plex-mono)",
                                  fontSize: "11px",
                                  color: playbackRate === 1 ? "var(--color-text-faint)" : "var(--color-gold)",
                                  transition: "border-color 0.2s ease, color 0.2s ease",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-gold-dim)"; e.currentTarget.style.color = "var(--color-gold)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-line)"; e.currentTarget.style.color = playbackRate === 1 ? "var(--color-text-faint)" : "var(--color-gold)"; }}
                              >
                                {playbackRate}×
                              </button>

                              {/* Reiniciar desde cero si estaba reanudado */}
                              {resumeNotice && (
                                <button
                                  onClick={restartFromZero}
                                  className="flex items-center gap-1.5"
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    padding: 0,
                                    fontFamily: "var(--font-ibm-plex-mono)",
                                    fontSize: "10px",
                                    color: "var(--color-text-muted)",
                                  }}
                                >
                                  <RotateCcw style={{ width: "11px", height: "11px" }} />
                                  Reanudado
                                </button>
                              )}

                              {/* Descargar */}
                              {archivo.storage_key && (
                                <a
                                  href={`/api/stream/${archivo.id}?download=1`}
                                  download
                                  title="Descargar audio"
                                  className="flex items-center gap-1.5"
                                  style={{
                                    marginLeft: "auto",
                                    fontSize: "11px",
                                    fontWeight: 500,
                                    color: "var(--color-text-muted)",
                                    textDecoration: "none",
                                    transition: "color 0.2s ease",
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-gold)")}
                                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
                                >
                                  <Download style={{ width: "13px", height: "13px" }} />
                                  Descargar
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Botón play principal */}
                        {playingId !== archivo.id && (
                          <button
                            onClick={() => handlePlay(archivo)}
                            className="flex items-center gap-3"
                            style={{
                              fontSize: "13px",
                              fontWeight: 500,
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                            }}
                          >
                            <div
                              className="flex items-center justify-center"
                              style={{
                                width: "34px",
                                height: "34px",
                                borderRadius: "50%",
                                border: "1px solid var(--color-gold-dim)",
                              }}
                            >
                              <Play style={{ width: "12px", height: "12px", color: "var(--color-gold)", marginLeft: "1px" }} fill="var(--color-gold)" />
                            </div>
                            <span className="card-link">
                              {getResumeTime(archivo.id) > 15 ? "Continuar" : "Reproducir"}
                            </span>
                          </button>
                        )}
                      </div>
                    ) : isYouTube ? (
                      <button
                        onClick={() => handlePlay(archivo)}
                        className="card-link"
                        style={{
                          fontSize: "13px",
                          fontWeight: 500,
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        Abrir en YouTube
                        <ExternalLink style={{ width: "14px", height: "14px" }} />
                      </button>
                    ) : isArchivo || isEnlace ? (
                      <button
                        onClick={() => {
                          if (archivo.youtube_url) window.open(archivo.youtube_url, "_blank");
                          else if (archivo.storage_key) window.open(`/api/stream/${archivo.id}?download=1`, "_blank");
                        }}
                        className="card-link"
                        style={{
                          fontSize: "13px",
                          fontWeight: 500,
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        {isEnlace ? "Abrir enlace" : "Descargar archivo"}
                        <ExternalLink style={{ width: "14px", height: "14px" }} />
                      </button>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ═══════════ FOOTER ═══════════ */}
      <PortalFooter />
    </div>
  );
}
