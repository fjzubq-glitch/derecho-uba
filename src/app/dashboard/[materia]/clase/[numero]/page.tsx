"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { trackActivity } from "@/lib/tracking";
import { ArrowLeft, ArrowRight, Calendar, Play, Pause, FileText, Headphones, Download, RotateCcw, Check, Loader2, Link2 } from "@/components/icons";
import { formatDuration, formatFechaLocal } from "@/lib/utils";
import { saveAudioOffline, getAudioOffline, deleteAudioOffline, isAudioOffline, saveClaseOffline, getClaseOffline } from "@/lib/offline";
import { useAudio } from "@/components/AudioProvider";

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
  tema: string | null;
  fecha: string | null;
  archivos: Archivo[];
}

interface MateriaData {
  id: string;
  nombre: string;
}

type CardTipo = "audio_clase" | "clase_youtube" | "video_resumen" | "transcripcion" | "archivo" | "enlace" | "cuestionario";

function isHtmlArchivo(a: Archivo | null): boolean {
  if (!a || !a.storage_key) return false;
  return /\.html?$/i.test(a.storage_key);
}

function descargarTexto(archivo: Archivo) {
  const contenido = archivo.contenido_texto || "";
  const blob = new Blob([contenido], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const base = (archivo.nombre_display || "transcripcion").replace(/[^\wÁÉÍÓÚáéíóúñÑ -]/g, "").trim() || "transcripcion";
  a.href = url;
  a.download = `${base}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

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
  video_resumen: {
    icon: <Play style={{ width: "18px", height: "18px", color: "var(--color-gold)" }} />,
    label: "VIDEO RESUMEN",
    subtitle: () => "Ver resumen en video",
  },
  transcripcion: {
    icon: <FileText style={{ width: "18px", height: "18px", color: "var(--color-gold)" }} />,
    label: "TRANSCRIPCIÓN",
    subtitle: () => "Ver documento completo",
  },
  archivo: {
    icon: <FileText style={{ width: "18px", height: "18px", color: "var(--color-gold)" }} />,
    label: "ARCHIVO",
    subtitle: (a) => (isHtmlArchivo(a) ? "Ver web interactiva" : "Abrir material"),
  },
  enlace: {
    icon: <Link2 style={{ width: "18px", height: "18px", color: "var(--color-gold)" }} />,
    label: "ENLACE ÚTIL",
    subtitle: () => "Abrir enlace",
  },
  cuestionario: {
    icon: <Check style={{ width: "18px", height: "18px", color: "var(--color-gold)" }} />,
    label: "CUESTIONARIO INTERACTIVO",
    subtitle: () => "Abrir cuestionario",
  },
};

const TIPOS_ORDEN: CardTipo[] = ["audio_clase", "clase_youtube", "video_resumen", "transcripcion", "archivo", "enlace", "cuestionario"];

export default function ClaseNumeroPage() {
  const params = useParams();
  const router = useRouter();
  const materiaSlug = params.materia as string;
  const numero = params.numero as string;

  const [materia, setMateria] = useState<MateriaData | null>(null);
  const [clase, setClase] = useState<Clase | null>(null);
  const [loading, setLoading] = useState(true);
  const [prevClase, setPrevClase] = useState<Clase | null>(null);
  const [nextClase, setNextClase] = useState<Clase | null>(null);

  // Audio player global (persiste entre rutas)
  const { currentTrack, isPlaying, currentTime, duration, playbackRate, play, togglePlay, seek, cycleSpeed, restart: restartAudio } = useAudio();
  const playingArchivoId = currentTrack?.id ?? null;
  const playingTipo = currentTrack?.tipo as CardTipo | null;

  // Offline state
  const [offlineStatus, setOfflineStatus] = useState<Record<string, "idle" | "downloading" | "saved">>({});
  const [offlineProgress, setOfflineProgress] = useState<Record<string, number>>({});
  const [offlineError, setOfflineError] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);

  // Transcription expand
  const [openTranscripcion, setOpenTranscripcion] = useState(false);
  // Solo el admin ve las cards de cuestionario
  const [esAdmin, setEsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((d) => setEsAdmin(!!d.ok))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (materiaSlug && numero) {
      loadData();
      trackActivity({ tipo: "page_view", pagina: "clase_detalle", materia_slug: materiaSlug });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materiaSlug, numero]);

  useEffect(() => {
    if (!clase) return;
    const audios = clase.archivos.filter((a) => a.tipo === "audio_clase");
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

async function loadData() {
    const cacheKey = `materia:${materiaSlug}:clase:${numero}`;
    const num = parseInt(numero);
    try {
      const res = await fetch(`/api/materias/${materiaSlug}/clases/${numero}`);
      const data = await res.json();
      if (data.materia) setMateria(data.materia);
      if (data.clase) {
        setClase(data.clase);
        saveClaseOffline(cacheKey, data);
      }
      const adj = (data.adjacentes || []) as Clase[];
      setPrevClase(adj.find((c) => c.numero === num - 1) || null);
      setNextClase(adj.find((c) => c.numero === num + 1) || null);
    } catch (e) {
      console.error("Error loading clase, intentando offline:", e);
      setOfflineMode(true);
      const cached = await getClaseOffline(cacheKey);
      if (cached) {
        const anyData = cached as { materia?: MateriaData; clase?: Clase; adjacentes?: Clase[] };
        if (anyData.materia) setMateria(anyData.materia);
        if (anyData.clase) setClase(anyData.clase);
        const adj = anyData.adjacentes || [];
        setPrevClase(adj.find((c) => c.numero === num - 1) || null);
        setNextClase(adj.find((c) => c.numero === num + 1) || null);
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

  function youtubeEmbedUrl(url: string): string | null {
    const id = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1];
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }

  const { title: materiaTitle } = materia ? splitName(materia.nombre) : { title: "" };

function getArchivos(tipo: CardTipo): Archivo[] {
    return clase?.archivos.filter((a) => a.tipo === tipo) || [];
  }

    function isAudioTipo(tipo: CardTipo) {
      return tipo === "audio_clase";
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

     const usarOffline = async () => {
       const blob = await getAudioOffline(archivo.id);
       let src = audioSourceUrl(archivo);
       if (blob) {
         src = URL.createObjectURL(blob);
       }
       play({
         id: archivo.id,
         nombre: archivo.nombre_display,
         tipo: archivo.tipo,
         src,
         materiaSlug,
         claseNumero: clase?.numero ?? 0,
         durationGuess: archivo.duration_seconds || 0,
       });
     };

     usarOffline();
   }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    seek(Number(e.target.value));
  }

  function restartFromZero() {
    restartAudio();
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

   async function handleCardClick(archivo: Archivo | null) {
     if (!archivo) return;
     const tipo = archivo.tipo as CardTipo;
if (isTranscription(tipo)) {
        handleTranscriptionClick(archivo);
      } else if (tipo === "clase_youtube") {
        if (archivo.youtube_url) {
          window.open(archivo.youtube_url, "_blank");
          trackActivity({ tipo: "youtube_open", pagina: "clase_detalle", materia_slug: materiaSlug, archivo_id: archivo.id });
        }
      } else if (tipo === "video_resumen") {
        // Inline embed — no action needed on card click
      } else if (isEnlace(tipo)) {
        if (archivo.youtube_url) {
          window.open(archivo.youtube_url, "_blank");
          trackActivity({ tipo: "enlace_open", pagina: "clase_detalle", materia_slug: materiaSlug, archivo_id: archivo.id });
        }
  } else if (tipo === "archivo") {
        if (archivo.youtube_url) {
          window.open(archivo.youtube_url, "_blank");
          trackActivity({ tipo: "file_open", pagina: "clase_detalle", materia_slug: materiaSlug, archivo_id: archivo.id });
        } else if (archivo.storage_key) {
          if (isHtmlArchivo(archivo)) {
            const back = `/dashboard/${materiaSlug}/clase/${numero}`;
            window.open(`/visor/${archivo.id}?back=${encodeURIComponent(back)}&nombre=${encodeURIComponent(archivo.nombre_display)}`, "_blank");
            trackActivity({ tipo: "html_view", pagina: "clase_detalle", materia_slug: materiaSlug, archivo_id: archivo.id });
          } else {
            window.open(`/api/stream/${archivo.id}`, "_blank");
            trackActivity({ tipo: "file_open", pagina: "clase_detalle", materia_slug: materiaSlug, archivo_id: archivo.id });
          }
        }
      } else if (tipo === "cuestionario") {
        if (archivo.storage_key) {
          const back = `/dashboard/${materiaSlug}/clase/${numero}`;
          let url = `/visor/${archivo.id}?back=${encodeURIComponent(back)}&nombre=${encodeURIComponent(archivo.nombre_display)}`;
          try {
            const tokenRes = await fetch(`/api/admin/visor-token?id=${archivo.id}`);
            if (tokenRes.ok) {
              const { token } = await tokenRes.json();
              url += `&t=${encodeURIComponent(token)}`;
            }
          } catch {
            // si falla el token, abre igual (el visor mostrara "No autorizado")
          }
          window.open(url, "_blank");
          trackActivity({ tipo: "quiz_open", pagina: "clase_detalle", materia_slug: materiaSlug, archivo_id: archivo.id });
        }
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

    const base = TIPOS_ORDEN.slice(0, TIPOS_ORDEN.indexOf(tipo)).reduce((s, t) => s + getArchivos(t).length, 0);
    return archivos.map((archivo, i) => renderArchivoCard(tipo, archivo, isThisPlaying, base + i));
  }

  function renderArchivoCard(tipo: CardTipo, archivo: Archivo, isThisPlaying: boolean, cardIndex: number) {
    const config = CARD_CONFIG[tipo];

    // Video resumen: render inline YouTube embed
    if (tipo === "video_resumen" && archivo.youtube_url) {
      const embedUrl = youtubeEmbedUrl(archivo.youtube_url);
      if (embedUrl) {
        return (
          <article
            key={archivo.id}
            className="card-reveal"
            style={{
              background: "var(--color-card)",
              padding: "28px 24px",
              opacity: 1,
              animationDelay: `${cardIndex * 55}ms`,
              border: "1px solid var(--color-line-soft)",
              gridColumn: "1 / -1",
            }}
          >
            <div className="flex items-center gap-2 mb-4">
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
              <div>
                <p
                  style={{
                    fontFamily: "var(--font-ibm-plex-mono)",
                    fontSize: "9px",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--color-gold)",
                  }}
                >
                  {config.label}
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                    fontWeight: 500,
                    fontSize: "18px",
                    color: "var(--color-text)",
                  }}
                >
                  {archivo.nombre_display}
                </p>
              </div>
            </div>
            <div
              style={{
                position: "relative",
                paddingBottom: "56.25%",
                height: 0,
                overflow: "hidden",
                border: "1px solid var(--color-line-soft)",
              }}
            >
              <iframe
                src={embedUrl}
                title={archivo.nombre_display}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  border: 0,
                }}
              />
            </div>
            {archivo.nota && (
              <p
                style={{
                  fontFamily: "var(--font-ibm-plex-mono)",
                  fontSize: "11px",
                  color: "var(--color-gold)",
                  fontStyle: "italic",
                  marginTop: "12px",
                }}
              >
                {archivo.nota}
              </p>
            )}
          </article>
        );
      }
    }

    const youtubeThumb = archivo.youtube_url ? youtubeThumbUrl(archivo.youtube_url) : null;
    const isActive = playingArchivoId === archivo.id;

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
        className="card-reveal card-hover"
        style={{
          background: "var(--color-card)",
          padding: "28px 24px",
          position: "relative",
          opacity: 1,
          cursor: "pointer",
          animationDelay: `${cardIndex * 55}ms`,
          transition: "background 0.25s ease, transform 0.25s ease, opacity 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease",
          boxShadow: isActive ? "inset 0 0 0 1px var(--color-gold)" : "none",
          border: "1px solid var(--color-line-soft)",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-card-hover)"; e.currentTarget.style.borderColor = "var(--color-gold-dim)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-card)"; e.currentTarget.style.borderColor = "var(--color-line-soft)"; }}
        onClick={() => handleCardClick(archivo)}
      >
        <div className="flex items-start justify-between gap-3" style={{ position: "relative", zIndex: 1 }}>
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
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                columnGap: "6px",
                rowGap: "2px",
                lineHeight: 1.4,
              }}
            >
              {config.label}
              {tipo === "cuestionario" && (
                <span
                  style={{
                    background: "#22c55e",
                    color: "#000",
                    fontSize: "8px",
                    fontFamily: "var(--font-ibm-plex-mono)",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    padding: "1px 5px",
                    borderRadius: "3px",
                    lineHeight: "14px",
                    textTransform: "uppercase",
                  }}
                >
                  Admin
                </span>
              )}
              <div
                className="flex items-end"
                style={{ gap: "2px", height: "10px", opacity: isThisPlaying ? 1 : 0, transition: "opacity 0.2s ease" }}
                aria-label="Reproduciendo"
              >
                <span className="eq-bar" />
                <span className="eq-bar" />
                <span className="eq-bar" />
                <span className="eq-bar" />
              </div>
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
          {(tipo === "archivo" && archivo.storage_key) || (isTranscription(tipo) && (archivo.storage_key || archivo.contenido_texto)) ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (archivo.storage_key) {
                  window.open(`/api/stream/${archivo.id}?download=1`, "_blank");
                  trackActivity({ tipo: "file_download", pagina: "clase_detalle", materia_slug: materiaSlug, archivo_id: archivo.id });
                } else if (archivo.contenido_texto) {
                  descargarTexto(archivo);
                  trackActivity({ tipo: "transcription_download", pagina: "clase_detalle", materia_slug: materiaSlug, archivo_id: archivo.id });
                }
              }}
              className="flex items-center gap-1.5"
              title={isTranscription(tipo) ? "Descargar transcripción" : "Descargar material"}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "10px",
                color: "var(--color-text-muted)",
                flexShrink: 0,
                marginTop: "14px",
                transition: "color 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-gold)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
            >
              <Download style={{ width: "12px", height: "12px" }} />
              Descargar
            </button>
          ) : (
            <ArrowRight style={{ width: "16px", height: "16px", color: "var(--color-gold)", flexShrink: 0, marginTop: "14px" }} />
          )}
        </div>

        {/* Thumbnail YouTube */}
        {youtubeThumb && (
          <div className="mt-4">
            <Image
              src={youtubeThumb}
              alt=""
              width={320}
              height={180}
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

   // Orden fijo de las cards en todas las clases:
  // 1° audio o video de la clase, 2° transcripción, 3° resto
  // El cuestionario solo se muestra al administrador
  const tipos: CardTipo[] = ["audio_clase", "clase_youtube", "video_resumen", "transcripcion", "archivo", "enlace", ...(esAdmin ? (["cuestionario"] as CardTipo[]) : [])];

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
      {/* ═══════════ MAIN ═══════════ */}
      <main className="flex-1">
        <div className="pad-lateral" style={{ padding: "60px 48px 120px" }}>
          {/* Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0" style={{ marginBottom: "32px" }}>
            <button
              onClick={() => router.push(`/dashboard/${materiaSlug}`)}
              className="flex items-center justify-center flex-shrink-0"
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
              className="min-w-0"
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "10px",
                letterSpacing: "0.08em",
                color: "var(--color-text-faint)",
                textTransform: "uppercase",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
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
            <div className="flex items-center justify-between gap-4 flex-wrap">
              {clase.tema && (
                <div
                  style={{
                    fontFamily: "var(--font-ibm-plex-mono)",
                    fontSize: "10px",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--color-gold)",
                  }}
                >
                  {clase.tema}
                </div>
              )}
              <span className="clase">
                Clase{" "}
                <span className="clase-num">Nº {String(clase.numero).padStart(2, "0")}</span>
              </span>
            </div>
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
          {clase.archivos.filter((a) => esAdmin || a.tipo !== "cuestionario").length === 0 ? (
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
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {tipos.flatMap(renderCard)}
            </div>
          )}
        </div>
      </main>

      {/* ═══════════ NAVEGACIÓN ENTRE CLASES ═══════════ */}
      {(prevClase || nextClase) && (
        <nav
          aria-label="Navegación entre clases"
          className="pad-lateral"
          style={{ padding: "0 48px 40px", borderTop: "1px solid var(--color-line-soft)" }}
        >
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            style={{ marginTop: "48px" }}
          >
            {prevClase ? (
              <button
                onClick={() => router.push(`/dashboard/${materiaSlug}/clase/${prevClase.numero}`)}
                className="card-reveal card-hover flex items-center gap-4 text-left cursor-pointer"
                style={{
                  background: "var(--color-card)",
                  padding: "24px",
                  border: "1px solid var(--color-line-soft)",
                  transition: "background 0.25s ease, border-color 0.25s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-card-hover)"; e.currentTarget.style.borderColor = "var(--color-gold-dim)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-card)"; e.currentTarget.style.borderColor = "var(--color-line-soft)"; }}
              >
                <ArrowLeft style={{ width: "16px", height: "16px", color: "var(--color-gold)", flexShrink: 0 }} />
                <div className="min-w-0">
                  <p style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-gold)", marginBottom: "4px" }}>
                    Clase anterior
                  </p>
                  <p style={{ fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif", fontSize: "15px", color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {prevClase.titulo}
                  </p>
                </div>
              </button>
            ) : (
              <div />
            )}

            {nextClase && (
              <button
                onClick={() => router.push(`/dashboard/${materiaSlug}/clase/${nextClase.numero}`)}
                className="card-reveal card-hover flex items-center justify-end gap-4 text-right cursor-pointer"
                style={{
                  background: "var(--color-card)",
                  padding: "24px",
                  border: "1px solid var(--color-line-soft)",
                  transition: "background 0.25s ease, border-color 0.25s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-card-hover)"; e.currentTarget.style.borderColor = "var(--color-gold-dim)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-card)"; e.currentTarget.style.borderColor = "var(--color-line-soft)"; }}
              >
                <div className="min-w-0">
                  <p style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-gold)", marginBottom: "4px" }}>
                    Siguiente clase
                  </p>
                  <p style={{ fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif", fontSize: "15px", color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {nextClase.titulo}
                  </p>
                </div>
                <ArrowRight style={{ width: "16px", height: "16px", color: "var(--color-gold)", flexShrink: 0 }} />
              </button>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
