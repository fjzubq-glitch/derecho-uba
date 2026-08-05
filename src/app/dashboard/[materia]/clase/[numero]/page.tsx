"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import PortalFooter from "@/components/PortalFooter";
import { trackActivity } from "@/lib/tracking";
import { ArrowLeft, ArrowRight, Calendar, Play, Pause, FileText, Headphones, Volume2, Download, RotateCcw, Check, Loader2, Link2 } from "@/components/icons";
import { formatDuration, formatFechaLocal, saveResumeTime, getResumeTime, clearResumeTime, isAdminSession } from "@/lib/utils";
import { saveAudioOffline, getAudioOffline, deleteAudioOffline, isAudioOffline, saveClaseOffline, getClaseOffline } from "@/lib/offline";

interface Archivo {
  id: string;
  tipo: string;
  nombre_display: string;
  storage_key: string | null;
  youtube_url: string | null;
  cloudinary_url: string | null;
  contenido_texto: string | null;
  nota: string | null;
  duration_seconds: number | null;
  play_count: number;
}

interface Clase {
  id: string;
  numero: number;
  titulo: string;
  fecha: string | null;
  archivos: Archivo[];
}

interface MateriaData {
  id: string;
  nombre: string;
}

type CardTipo = "audio_clase" | "clase_youtube" | "transcripcion" | "podcast" | "archivo" | "enlace";

const CARD_CONFIG: Record<CardTipo, {
  icon: React.ReactNode;
  label: string;
  subtitle: (a: Archivo) => string;
}> = {
  audio_clase: {
    icon: <Headphones style={{ width: "18px", height: "18px", color: "var(--color-gold)" }} />,
    label: "AUDIO DE CLASE",
    subtitle: () => "Disponible",
  },
  clase_youtube: {
    icon: <Play style={{ width: "18px", height: "18px", color: "var(--color-gold)" }} />,
    label: "CLASE VIRTUAL",
    subtitle: () => "Ver clase grabada",
  },
  transcripcion: {
    icon: <FileText style={{ width: "18px", height: "18px", color: "var(--color-gold)" }} />,
    label: "TRANSCRIPCIÓN",
    subtitle: () => "Ver documento completo",
  },
  podcast: {
    icon: <Volume2 style={{ width: "18px", height: "18px", color: "var(--color-gold)" }} />,
    label: "PODCAST",
    subtitle: () => "Disponible",
  },
  archivo: {
    icon: <FileText style={{ width: "18px", height: "18px", color: "var(--color-gold)" }} />,
    label: "ARCHIVO",
    subtitle: () => "Descargar material",
  },
  enlace: {
    icon: <Link2 style={{ width: "18px", height: "18px", color: "var(--color-gold)" }} />,
    label: "ENLACE ÚTIL",
    subtitle: () => "Abrir enlace",
  },
};

export default function ClaseNumeroPage() {
  const params = useParams();
  const router = useRouter();
  const materiaSlug = params.materia as string;
  const numero = params.numero as string;

  const [materia, setMateria] = useState<MateriaData | null>(null);
  const [clase, setClase] = useState<Clase | null>(null);
  const [loading, setLoading] = useState(true);

  // Audio player state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playingTipo, setPlayingTipo] = useState<CardTipo | null>(null);
  const [playingArchivoId, setPlayingArchivoId] = useState<string | null>(null);
  const [playingSrc, setPlayingSrc] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const playTrackedRef = useRef<string | null>(null);
  const [offlineStatus, setOfflineStatus] = useState<Record<string, "idle" | "downloading" | "saved">>({});
  const [offlineProgress, setOfflineProgress] = useState<Record<string, number>>({});
  const [offlineError, setOfflineError] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  // Transcription expand
  const [openTranscripcion, setOpenTranscripcion] = useState(false);

  useEffect(() => {
    if (materiaSlug && numero) {
      loadData();
      trackActivity({ tipo: "page_view", pagina: "clase_detalle", materia_slug: materiaSlug });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materiaSlug, numero]);

  useEffect(() => {
    if (!clase) return;
    const audios = clase.archivos.filter((a) => a.tipo === "audio_clase" || a.tipo === "podcast");
    audios.forEach((a) => {
      isAudioOffline(a.id).then((saved) => {
        if (saved) {
          setOfflineStatus((prev) => ({ ...prev, [a.id]: "saved" }));
        }
      });
    });
  }, [clase]);

  function audioSourceUrl(archivo: Archivo) {
    return archivo.cloudinary_url || `/api/stream/${archivo.id}`;
  }

  async function guardarOffline(archivo: Archivo) {
    try {
      setOfflineError(null);
      setOfflineStatus((prev) => ({ ...prev, [archivo.id]: "downloading" }));
      setOfflineProgress((prev) => ({ ...prev, [archivo.id]: 0 }));
      await saveAudioOffline(archivo.id, audioSourceUrl(archivo), (p) => {
        setOfflineProgress((prev) => ({ ...prev, [archivo.id]: p }));
      });
      setOfflineStatus((prev) => ({ ...prev, [archivo.id]: "saved" }));
    } catch (e) {
      setOfflineStatus((prev) => ({ ...prev, [archivo.id]: "idle" }));
      setOfflineError("No se pudo guardar el audio. Verificá la conexión e intentá de nuevo.");
      console.error("Error guardando offline:", e);
    }
  }

  async function eliminarOffline(archivo: Archivo) {
    await deleteAudioOffline(archivo.id);
    setOfflineStatus((prev) => ({ ...prev, [archivo.id]: "idle" }));
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

const onTimeUpdate = () => {
     setCurrentTime(audio.currentTime);
     if (playingArchivoId) {
       const archivo = getArchivoById(playingArchivoId);
       if (archivo) saveResumeTime(archivo.id, audio.currentTime);
     }
   };
     const onDurationChange = () => {
       setDuration(audio.duration);
       if (playingArchivoId) {
         const archivo = getArchivoById(playingArchivoId);
         if (archivo && Number.isFinite(audio.duration) && audio.duration > 0) {
           fetch("/api/stream/" + archivo.id, {
             method: "PUT",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ duration: Math.round(audio.duration) }),
           }).catch(() => {});
         }
       }
     };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (playingArchivoId) {
        const archivo = getArchivoById(playingArchivoId);
        if (archivo) clearResumeTime(archivo.id);
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playingArchivoId, clase]);

  // Aplicar velocidad de reproducción
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate, playingTipo, playingSrc]);

  async function loadData() {
    const cacheKey = `materia:${materiaSlug}:clase:${numero}`;
    try {
      const res = await fetch(`/api/materias/${materiaSlug}`);
      const data = await res.json();
      if (data.materia) setMateria(data.materia);
      if (data.clases) {
        const found = data.clases.find((c: Clase) => c.numero === parseInt(numero));
        if (found) {
          setClase(found);
          saveClaseOffline(cacheKey, data);
        }
      }
    } catch (e) {
      console.error("Error loading clase, intentando offline:", e);
      setOfflineMode(true);
      const cached = await getClaseOffline(cacheKey);
      if (cached) {
        const anyData = cached as { materia?: MateriaData; clases?: Clase[] };
        if (anyData.materia) setMateria(anyData.materia);
        const found = (anyData.clases || []).find((c) => c.numero === parseInt(numero));
        if (found) setClase(found);
      }
    }
    setLoading(false);
  }

  const splitName = (n: string) => {
    const p = n.split(",");
    return { title: p[0]?.trim() || n, meta: p.slice(1).map((s) => s.trim()).join(", ") || null };
  };

  function youtubeThumbUrl(url: string): string | null {
    const id = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1];
    return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
  }

  const { title: materiaTitle } = materia ? splitName(materia.nombre) : { title: "" };

  function getArchivos(tipo: CardTipo): Archivo[] {
    return clase?.archivos.filter((a) => a.tipo === tipo) || [];
  }

  function getArchivoById(id: string | null): Archivo | undefined {
    if (!id) return undefined;
    return clase?.archivos.find((a) => a.id === id);
  }

    function isAudioTipo(tipo: CardTipo) {
      return tipo === "audio_clase" || tipo === "podcast";
    }

    function isTranscription(tipo: CardTipo) {
      return tipo === "transcripcion";
    }

    function isEnlace(tipo: CardTipo) {
      return tipo === "enlace";
    }

   function handleAudioAction(archivo: Archivo) {
     if (!archivo) return;

     if (archivo.youtube_url) {
       window.open(archivo.youtube_url, "_blank");
       trackActivity({ tipo: "youtube_open", pagina: "clase_detalle", materia_slug: materiaSlug, archivo_id: archivo.id });
       return;
     }

     if (playingArchivoId === archivo.id) {
       togglePlay();
       return;
     }

     setPlayingTipo(archivo.tipo as CardTipo);
     setPlayingArchivoId(archivo.id);

     const usarOffline = async () => {
       const blob = await getAudioOffline(archivo.id);
       if (blob) {
         if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
         const objUrl = URL.createObjectURL(blob);
         objectUrlRef.current = objUrl;
         setPlayingSrc(objUrl);
       } else {
         setPlayingSrc(audioSourceUrl(archivo));
       }
       setCurrentTime(0);
       setDuration(archivo.duration_seconds || 0);
       setIsPlaying(false);
       playTrackedRef.current = null;

       setTimeout(() => {
         const audio = audioRef.current;
         if (!audio) return;
         audio.playbackRate = playbackRate;
         const resumeAt = getResumeTime(archivo.id);
         if (resumeAt > 15) {
           audio.currentTime = resumeAt;
           setCurrentTime(resumeAt);
         }
       }, 100);
     };

     usarOffline();
   }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (playingArchivoId && playTrackedRef.current !== playingArchivoId) {
        const archivo = getArchivoById(playingArchivoId);
        if (archivo) {
          if (!isAdminSession()) {
            fetch("/api/analytics", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ archivo_id: archivo.id }),
            }).catch(() => {});
          }
          trackActivity({ tipo: "play_start", pagina: "clase_detalle", materia_slug: materiaSlug, archivo_id: archivo.id });
          playTrackedRef.current = playingArchivoId;
        }
      }
      audio.play().catch(() => {});
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
    if (playingArchivoId) {
      const archivo = getArchivoById(playingArchivoId);
      if (archivo) clearResumeTime(archivo.id);
    }
  }

  function handleTranscriptionClick(archivo: Archivo) {
    if (!archivo) return;
    if (archivo.youtube_url) {
      window.open(archivo.youtube_url, "_blank");
      trackActivity({ tipo: "youtube_open", pagina: "clase_detalle", materia_slug: materiaSlug, archivo_id: archivo.id });
      return;
    }
    if (archivo.contenido_texto) {
      setOpenTranscripcion((prev) => !prev);
      if (!openTranscripcion) {
        trackActivity({ tipo: "transcription_view", pagina: "clase_detalle", materia_slug: materiaSlug, archivo_id: archivo.id });
      }
    }
  }

   function handleCardClick(archivo: Archivo | null) {
     if (!archivo) return;
     const tipo = archivo.tipo as CardTipo;
if (isTranscription(tipo)) {
        handleTranscriptionClick(archivo);
      } else if (tipo === "clase_youtube") {
        if (archivo.youtube_url) {
          window.open(archivo.youtube_url, "_blank");
          trackActivity({ tipo: "youtube_open", pagina: "clase_detalle", materia_slug: materiaSlug, archivo_id: archivo.id });
        }
      } else if (isEnlace(tipo)) {
        if (archivo.youtube_url) window.open(archivo.youtube_url, "_blank");
      } else if (tipo === "archivo") {
       if (archivo.youtube_url) window.open(archivo.youtube_url, "_blank");
       else if (archivo.storage_key) window.open(`/api/stream/${archivo.id}?download=1`, "_blank");
} else if (isAudioTipo(tipo)) {
       handleAudioAction(archivo);
     }
   }

    function renderCard(tipo: CardTipo) {
    const archivos = getArchivos(tipo);
    const isThisPlaying = playingTipo === tipo && isPlaying;

    if (archivos.length === 0) {
      return [];
    }

    return archivos.map((archivo) => renderArchivoCard(tipo, archivo, isThisPlaying));
  }

  function renderArchivoCard(tipo: CardTipo, archivo: Archivo, isThisPlaying: boolean) {
    const config = CARD_CONFIG[tipo];
    const youtubeThumb = archivo.youtube_url ? youtubeThumbUrl(archivo.youtube_url) : null;

    return (
      <article
        key={archivo.id}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCardClick(archivo);
          }
        }}
        style={{
          background: "var(--color-card)",
          padding: "28px 24px",
          opacity: 1,
          cursor: "pointer",
          transition: "background 0.25s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-card-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-card)"; }}
        onClick={() => handleCardClick(archivo)}
      >
        <div className="flex items-start justify-between gap-3">
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              border: "1px solid var(--color-gold-dim)",
            }}
          >
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "9px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--color-gold)",
                marginBottom: "6px",
              }}
            >
              {config.label}
            </div>
            <p
              style={{
                fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                fontWeight: 500,
                fontSize: "20px",
                lineHeight: 1.25,
                color: "var(--color-text)",
                marginBottom: "4px",
                overflowWrap: "break-word",
              }}
            >
              {archivo.nombre_display}
            </p>
            <div
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "11px",
                color: "var(--color-text-faint)",
              }}
            >
              {config.subtitle(archivo)}
            </div>
            {archivo.nota && (
              <p
                style={{
                  fontFamily: "var(--font-ibm-plex-mono)",
                  fontSize: "11px",
                  color: "var(--color-gold)",
                  fontStyle: "italic",
                  marginTop: "6px",
                }}
              >
                {archivo.nota}
              </p>
            )}
          </div>
          <ArrowRight style={{ width: "16px", height: "16px", color: "var(--color-gold)", flexShrink: 0, marginTop: "14px" }} />
        </div>

        {/* Thumbnail YouTube */}
        {youtubeThumb && (
          <div className="mt-4" style={{ }}>
            {/* Miniaturas externas de YouTube: no se optimizan con next/image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={youtubeThumb}
              alt=""
              style={{
                width: "100%",
                height: "auto",
                borderRadius: "4px",
                border: "1px solid var(--color-line-soft)",
              }}
            />
          </div>
        )}

        {/* Audio player inline */}
        {isAudioTipo(tipo) && playingArchivoId === archivo.id && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--color-line-soft)" }}>
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
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
                onChange={(e) => { e.stopPropagation(); handleSeek(e); }}
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
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={(e) => { e.stopPropagation(); cycleSpeed(); }}
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
              <button
                onClick={(e) => { e.stopPropagation(); restartFromZero(); }}
                className="flex items-center gap-1.5"
                title="Reiniciar desde el inicio"
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
                Inicio
              </button>
              {isAudioTipo(tipo) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (offlineStatus[archivo.id] === "saved") {
                      eliminarOffline(archivo);
                    } else if (offlineStatus[archivo.id] !== "downloading") {
                      guardarOffline(archivo);
                    }
                  }}
                  title={
                    offlineStatus[archivo.id] === "saved"
                      ? "Audio guardado. Clic para eliminar la copia offline"
                      : "Guardar audio para escucharlo sin conexión (sin gastar datos)"
                  }
                  className="flex items-center gap-1.5"
                  style={{
                    marginLeft: "auto",
                    fontSize: "11px",
                    fontWeight: 500,
                    background: "none",
                    border: "none",
                    cursor: offlineStatus[archivo.id] === "downloading" ? "wait" : "pointer",
                    padding: 0,
                    fontFamily: "var(--font-inter)",
                    color:
                      offlineStatus[archivo.id] === "saved"
                        ? "var(--color-gold)"
                        : "var(--color-text-muted)",
                    transition: "color 0.2s ease",
                  }}
                >
                  {offlineStatus[archivo.id] === "saved" ? (
                    <>
                      <Check style={{ width: "13px", height: "13px" }} />
                      Offline
                    </>
                  ) : offlineStatus[archivo.id] === "downloading" ? (
                    <>
                      <Loader2 style={{ width: "13px", height: "13px", animation: "spin 1s linear infinite" }} />
                      Guardando {offlineProgress[archivo.id] ? Math.round(offlineProgress[archivo.id] * 100) : 0}%
                    </>
                  ) : (
                    <>
                      <Download style={{ width: "13px", height: "13px" }} />
                      Guardar offline
                    </>
                  )}
                </button>
              )}
            </div>
            {offlineError && (
              <p
                style={{
                  marginTop: "8px",
                  fontSize: "11px",
                  fontFamily: "var(--font-ibm-plex-mono)",
                  color: "#ff6b6b",
                }}
              >
                {offlineError}
              </p>
            )}
          </div>
        )}

        {/* Transcription expand */}
        {isTranscription(tipo) && openTranscripcion && archivo.contenido_texto && (
          <div
            style={{
              marginTop: "16px",
              padding: "16px",
              background: "rgba(0,0,0,0.2)",
              border: "1px solid var(--color-line-soft)",
              fontSize: "14px",
              color: "var(--color-text-muted)",
              lineHeight: 1.8,
              whiteSpace: "pre-wrap",
              maxHeight: "400px",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {archivo.contenido_texto}
          </div>
        )}
      </article>
    );
  }

   const tipos: CardTipo[] = ["audio_clase", "clase_youtube", "transcripcion", "podcast", "archivo", "enlace"];

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

  if (!clase) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--color-ink)" }}>
        <p style={{ color: "var(--color-text-faint)", fontSize: "14px" }}>Clase no encontrada</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-ink)" }}>
      {/* Hidden audio element */}
      <audio ref={audioRef} src={playingSrc} preload="metadata" />

      {/* ═══════════ MAIN ═══════════ */}
      <main className="flex-1">
        <div className="pad-lateral" style={{ padding: "60px 48px 120px" }}>
          {/* Breadcrumb */}
          <div className="flex items-center gap-3" style={{ marginBottom: "32px" }}>
            <button
              onClick={() => router.push(`/dashboard/${materiaSlug}`)}
              className="flex items-center justify-center"
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                border: "1px solid var(--color-gold)",
                color: "var(--color-gold)",
                transition: "border-color 0.25s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-gold-dim)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-gold)")}
            >
              <ArrowLeft style={{ width: "15px", height: "15px" }} />
            </button>
            <span
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "10px",
                letterSpacing: "0.08em",
                color: "var(--color-text-faint)",
                textTransform: "uppercase",
              }}
            >
              {materiaTitle}
            </span>
          </div>

          {/* Modo offline */}
          {offlineMode && (
            <div
              role="status"
              style={{
                marginBottom: "24px",
                padding: "12px 16px",
                border: "1px solid var(--color-gold-dim)",
                background: "rgba(0,0,0,0.2)",
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "11px",
                color: "var(--color-gold)",
              }}
            >
              Sin conexión. Mostrando contenido guardado. Las transcripciones y el audio guardado siguen disponibles.
            </div>
          )}

          {/* Page title */}
          <div style={{ marginBottom: "40px" }}>
            <h2
              style={{
                fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                fontWeight: 400,
                fontSize: "clamp(28px, 4vw, 40px)",
                lineHeight: 1.1,
                color: "var(--color-text)",
              }}
            >
              {clase.titulo}
            </h2>
            {clase.fecha && (
              <div
                className="flex items-center gap-2 mt-3"
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

          {/* Cards de contenido */}
          {clase.archivos.length === 0 ? (
            <div
              style={{
                padding: "80px 48px",
                textAlign: "center",
                background: "var(--color-card)",
                border: "1px solid var(--color-line-soft)",
              }}
            >
              <p style={{ color: "var(--color-text-muted)", fontSize: "15px" }}>
                Esta clase todavía no tiene contenido disponible
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
              {tipos.flatMap(renderCard)}
            </div>
          )}
        </div>
      </main>

      {/* ═══════════ FOOTER ═══════════ */}
      <PortalFooter />
    </div>
  );
}
