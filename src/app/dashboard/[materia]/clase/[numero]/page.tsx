"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { trackActivity } from "@/lib/tracking";
import { ArrowLeft, ArrowRight, Calendar, Play, Pause, FileText, Headphones, Volume2 } from "@/components/icons";
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
  fecha: string | null;
  archivos: Archivo[];
}

interface MateriaData {
  id: string;
  nombre: string;
}

type CardTipo = "audio_clase" | "transcripcion" | "podcast";

const CARD_CONFIG: Record<CardTipo, {
  icon: React.ReactNode;
  label: string;
  subtitle: (a: Archivo) => string;
  emptySubtitle: string;
}> = {
  audio_clase: {
    icon: <Headphones style={{ width: "24px", height: "24px", color: "var(--color-gold)" }} />,
    label: "AUDIO DE CLASE",
    subtitle: (a) => `${a.play_count} reproducciones`,
    emptySubtitle: "No disponible",
  },
  transcripcion: {
    icon: <FileText style={{ width: "24px", height: "24px", color: "var(--color-gold)" }} />,
    label: "TRANSCRIPCIÓN",
    subtitle: () => "Ver documento completo",
    emptySubtitle: "No disponible",
  },
  podcast: {
    icon: <Volume2 style={{ width: "24px", height: "24px", color: "var(--color-gold)" }} />,
    label: "PODCAST",
    subtitle: (a) => `${a.play_count} reproducciones`,
    emptySubtitle: "No disponible",
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
  const [playingSrc, setPlayingSrc] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Transcription expand
  const [openTranscripcion, setOpenTranscripcion] = useState(false);

  useEffect(() => {
    if (materiaSlug && numero) {
      loadData();
      trackActivity({ tipo: "page_view", pagina: "clase_detalle", materia_slug: materiaSlug });
    }
  }, [materiaSlug, numero]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration);
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
    };
  }, [playingTipo]);

  async function loadData() {
    try {
      const res = await fetch(`/api/materias/${materiaSlug}`);
      const data = await res.json();
      if (data.materia) setMateria(data.materia);
      if (data.clases) {
        const found = data.clases.find((c: Clase) => c.numero === parseInt(numero));
        if (found) setClase(found);
      }
    } catch (e) {
      console.error("Error loading clase:", e);
    }
    setLoading(false);
  }

  const splitName = (n: string) => {
    const p = n.split(",");
    return { title: p[0]?.trim() || n, meta: p.slice(1).map((s) => s.trim()).join(", ") || null };
  };

  const { title: materiaTitle } = materia ? splitName(materia.nombre) : { title: "" };

  function getArchivo(tipo: CardTipo): Archivo | undefined {
    return clase?.archivos.find((a) => a.tipo === tipo);
  }

  function handleAudioAction(tipo: CardTipo) {
    const archivo = getArchivo(tipo);
    if (!archivo) return;

    if (archivo.youtube_url) {
      window.open(archivo.youtube_url, "_blank");
      trackActivity({ tipo: "youtube_open", pagina: "clase_detalle", materia_slug: materiaSlug, archivo_id: archivo.id });
      return;
    }

    if (playingTipo === tipo) {
      togglePlay();
      return;
    }

    setPlayingTipo(tipo);
    setPlayingSrc(`/api/stream/${archivo.id}`);
    setCurrentTime(0);
    setDuration(archivo.duration_seconds || 0);
    setIsPlaying(true);

    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archivo_id: archivo.id }),
    }).catch(() => {});
    trackActivity({ tipo: "play_start", pagina: "clase_detalle", materia_slug: materiaSlug, archivo_id: archivo.id });

    setTimeout(() => {
      audioRef.current?.play();
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

  function handleTranscriptionToggle() {
    const archivo = getArchivo("transcripcion");
    if (!archivo) return;
    setOpenTranscripcion((prev) => !prev);
    if (!openTranscripcion) {
      trackActivity({ tipo: "transcription_view", pagina: "clase_detalle", materia_slug: materiaSlug, archivo_id: archivo.id });
    }
  }

  function renderCard(tipo: CardTipo) {
    const config = CARD_CONFIG[tipo];
    const archivo = getArchivo(tipo);
    const exists = !!archivo;
    const isAudioTipo = tipo === "audio_clase" || tipo === "podcast";
    const isThisPlaying = playingTipo === tipo && isPlaying;
    const isTranscription = tipo === "transcripcion";

    return (
      <article
        key={tipo}
        style={{
          background: "var(--color-card)",
          border: "1px solid var(--color-line-soft)",
          padding: "36px 32px",
          opacity: exists ? 1 : 0.4,
          cursor: exists ? "pointer" : "default",
          transition: "background 0.25s ease",
        }}
        onMouseEnter={(e) => { if (exists) e.currentTarget.style.background = "var(--color-card-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-card)"; }}
        onClick={() => {
          if (isTranscription && exists) {
            handleTranscriptionToggle();
          } else if (isAudioTipo && exists) {
            handleAudioAction(tipo);
          }
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-5">
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                border: "1px solid var(--color-gold-dim)",
              }}
            >
              {config.icon}
            </div>
            <div>
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
                  lineHeight: 1.2,
                  color: exists ? "var(--color-text)" : "var(--color-text-faint)",
                  marginBottom: "4px",
                }}
              >
                {exists ? archivo.nombre_display : "—"}
              </p>
              <div
                style={{
                  fontFamily: "var(--font-ibm-plex-mono)",
                  fontSize: "11px",
                  color: "var(--color-text-faint)",
                }}
              >
                {exists ? config.subtitle(archivo) : config.emptySubtitle}
              </div>
            </div>
          </div>
          {exists && (
            <ArrowRight style={{ width: "20px", height: "20px", color: "var(--color-gold)", flexShrink: 0, marginTop: "16px" }} />
          )}
        </div>

        {/* Audio player inline */}
        {isAudioTipo && isThisPlaying && exists && (
          <div className="flex items-center gap-3 mt-6 pt-6 border-t" style={{ borderColor: "var(--color-line-soft)" }}>
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
        )}

        {/* Transcription expand */}
        {isTranscription && openTranscripcion && exists && archivo.contenido_texto && (
          <div
            style={{
              marginTop: "20px",
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
            onClick={(e) => e.stopPropagation()}
          >
            {archivo.contenido_texto}
          </div>
        )}
      </article>
    );
  }

  const tipos: CardTipo[] = ["audio_clase", "transcripcion", "podcast"];

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

      {/* ═══════════ HEADER ═══════════ */}
      <header
        className="border-b"
        style={{
          borderColor: "var(--color-line-soft)",
          background: "linear-gradient(180deg, var(--color-ink-2) 0%, var(--color-ink) 100%)",
        }}
      >
        <div className="flex items-center justify-between pad-lateral" style={{ padding: "22px 48px" }}>
          <div className="flex items-center gap-4">
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
                Clase {clase.numero.toString().padStart(2, "0")}
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
                {clase.titulo}
              </h1>
            </div>
          </div>
          {clase.fecha && (
            <div
              className="hidden sm:flex items-center gap-2"
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "11px",
                color: "var(--color-text-faint)",
              }}
            >
              <Calendar style={{ width: "14px", height: "14px" }} />
              {new Date(clase.fecha).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          )}
        </div>
      </header>

      {/* ═══════════ MAIN ═══════════ */}
      <main className="flex-1">
        <div className="pad-lateral" style={{ padding: "60px 48px 120px" }}>
          {/* Breadcrumb */}
          <button
            onClick={() => router.push(`/dashboard/${materiaSlug}`)}
            className="flex items-center gap-2"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-ibm-plex-mono)",
              fontSize: "10px",
              letterSpacing: "0.08em",
              color: "var(--color-text-faint)",
              marginBottom: "32px",
              padding: 0,
              textTransform: "uppercase",
            }}
          >
            <ArrowLeft style={{ width: "12px", height: "12px" }} />
            {materiaTitle}
          </button>

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
                {new Date(clase.fecha).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
              </div>
            )}
          </div>

          {/* 3 cards */}
          <div className="space-y-4">
            {tipos.map(renderCard)}
          </div>
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
