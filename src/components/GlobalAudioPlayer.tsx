"use client";

import React from "react";
import { useAudio } from "./AudioProvider";
import { Play, Pause, X, RotateCcw } from "@/components/icons";
import { formatDuration } from "@/lib/utils";

export default function GlobalAudioPlayer() {
  const { currentTrack, isPlaying, currentTime, duration, playbackRate, togglePlay, seek, cycleSpeed, restart, stop } = useAudio();

  if (!currentTrack) return null;

  const playerBarStyle: React.CSSProperties = {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    background: "var(--color-ink)",
    borderTop: "1px solid var(--color-line-soft)",
    padding: "10px 20px",
  };

  const innerStyle: React.CSSProperties = {
    maxWidth: "1100px",
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    flexWrap: "wrap",
  };

  const roundBtnStyle: React.CSSProperties = {
    background: "transparent",
    border: "1px solid var(--color-gold)",
    color: "var(--color-gold)",
    borderRadius: "50%",
    width: "36px",
    height: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
    transition: "background 0.25s ease",
  };

  const iconBtn: React.CSSProperties = {
    background: "none",
    border: "none",
    color: "var(--color-text-muted)",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px",
    fontFamily: "var(--font-ibm-plex-mono)",
    fontSize: "10px",
    whiteSpace: "nowrap",
    transition: "color 0.2s ease",
  };

  return (
    <div style={playerBarStyle} className="global-player" aria-label="Reproductor de audio">
      <div style={innerStyle}>
        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          style={roundBtnStyle}
          title={isPlaying ? "Pausar" : "Reproducir"}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(212,168,82,0.15)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          {isPlaying ? (
            <Pause style={{ width: "13px", height: "13px" }} fill="var(--color-gold)" />
          ) : (
            <Play style={{ width: "13px", height: "13px", marginLeft: "2px" }} fill="var(--color-gold)" />
          )}
        </button>

        {/* -15s */}
        <button onClick={() => seek(currentTime - 15)} style={iconBtn} title="Retroceder 15 segundos">
          <RotateCcw style={{ width: "12px", height: "12px" }} />
          15
        </button>

        {/* Info del track */}
        <div className="flex-1 min-w-0">
          <p
            style={{
              fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
              fontWeight: 500,
              fontSize: "13px",
              color: "var(--color-text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              margin: 0,
            }}
          >
            {currentTrack.nombre}
          </p>
          <p
            style={{
              fontFamily: "var(--font-ibm-plex-mono)",
              fontSize: "9px",
              color: "var(--color-gold)",
              margin: "2px 0 0",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Clase {String(currentTrack.claseNumero).padStart(2, "0")}
          </p>
        </div>

        {/* Barra de progreso */}
        <div className="flex items-center gap-2 flex-1 min-w-[160px]" style={{ minWidth: "160px" }}>
          <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", color: "var(--color-text-faint)" }}>
            {formatDuration(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={(e) => seek(Number(e.target.value))}
            style={{ flex: 1 }}
            aria-label="Progreso del audio"
          />
          <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", color: "var(--color-text-faint)" }}>
            {formatDuration(duration)}
          </span>
        </div>

        {/* Velocidad */}
        <button
          onClick={cycleSpeed}
          style={{
            background: "none",
            border: "1px solid var(--color-line)",
            color: playbackRate === 1 ? "var(--color-text-faint)" : "var(--color-gold)",
            padding: "4px 9px",
            cursor: "pointer",
            fontFamily: "var(--font-ibm-plex-mono)",
            fontSize: "10px",
            whiteSpace: "nowrap",
            transition: "border-color 0.2s ease, color 0.2s ease",
          }}
          title="Velocidad de reproducción"
        >
          {playbackRate}×
        </button>

        {/* Reiniciar */}
        <button onClick={restart} style={iconBtn} title="Reiniciar desde el inicio">
          Inicio
        </button>

        {/* Cerrar */}
        <button onClick={stop} style={iconBtn} title="Cerrar reproductor">
          <X style={{ width: "14px", height: "14px" }} />
        </button>
      </div>
    </div>
  );
}