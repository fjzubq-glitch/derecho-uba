"use client";

import React, { useEffect, useRef, useState } from "react";

export default function BinauralPlayer() {
  const [hasAudio, setHasAudio] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const [isAdmin, setIsAdmin] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // solo para admin (si no hay audio o no es admin, no mostrar)
    fetch("/api/admin/binaural")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.ok && d?.binaural) {
          setHasAudio(true);
          setFileName(d.binaural.file_name);
          setIsAdmin(true);
        } else if (d?.ok) {
          // sin audio pero es admin -> no mostrar player hasta que suba
          setIsAdmin(false);
        }
      })
      .catch(() => {});
    // check admin via presence of cookie? si la api anterior dio 401, no es admin
    fetch("/api/admin/binaural")
      .then((r) => {
        if (r.status !== 401) setIsAdmin(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  if (!isAdmin || !hasAudio) return null;

  return (
    <>
      <audio
        ref={audioRef}
        src="/api/admin/binaural?stream=1"
        loop
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      {/* Botón flotante izquierda */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Música binaural"
        title={fileName || "Binaural"}
        style={{
          position: "fixed",
          bottom: "48px",
          left: "24px",
          zIndex: 90,
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          background: playing ? "rgba(185,154,98,0.18)" : "rgba(24,24,28,0.5)",
          border: "1px solid rgba(185,154,98,0.18)",
          color: playing ? "var(--color-gold)" : "var(--color-text-faint)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          backdropFilter: "blur(6px)",
          fontSize: "11px",
        }}
      >
        <span style={{ position: "relative" }}>
          ♪
          {playing && (
            <span
              style={{
                position: "absolute",
                top: "-1px",
                right: "-4px",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#22c55e",
                boxShadow: "0 0 4px #22c55e",
              }}
            />
          )}
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            bottom: "88px",
            left: "24px",
            zIndex: 90,
            width: "260px",
            background: "var(--color-card)",
            border: "1px solid var(--color-line-soft)",
            padding: "14px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          }}
        >
          <p style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-faint)", marginBottom: "8px" }}>
            Música binaural
          </p>
          <p style={{ fontSize: "12px", color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "10px" }}>
            {fileName || "binaural"}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!audioRef.current) return;
                if (playing) audioRef.current.pause();
                else audioRef.current.play().catch(() => {});
              }}
              style={{
                padding: "6px 12px",
                background: "var(--color-gold)",
                color: "var(--color-ink)",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "11px",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {playing ? "Pausar" : "Play"}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              style={{ flex: 1 }}
            />
          </div>
          <p style={{ fontSize: "10px", color: "var(--color-text-faint)", marginTop: "8px" }}>En loop · solo vos lo escuchás</p>
        </div>
      )}
    </>
  );
}
