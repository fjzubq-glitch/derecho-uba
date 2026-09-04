"use client";

import React, { useEffect, useRef, useState } from "react";

export default function BinauralPlayer() {
  const [hasAudio, setHasAudio] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);
  const BINAURAL_KEY = "binaural_shared";

  useEffect(() => {
    fetch("/api/admin/binaural")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.ok && d?.binaural) {
          setHasAudio(true);
          setFileName(d.binaural.file_name);
          setIsAdmin(true);
        } else if (d?.ok) {
          setIsAdmin(false);
        }
      })
      .catch(() => {});
    fetch("/api/admin/binaural")
      .then((r) => {
        if (r.status !== 401) setIsAdmin(true);
      })
      .catch(() => {});
  }, []);

  // Sincronización entre pestañas (mismo flotante, led y control)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(BINAURAL_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (typeof d.playing === "boolean") setPlaying(d.playing);
      }
    } catch {}
    try {
      bcRef.current = new BroadcastChannel("binaural");
      bcRef.current.onmessage = (e: MessageEvent) => {
        const d = e.data as { type: string };
        if (d?.type === "play") setPlaying(true);
        else if (d?.type === "pause") {
          setPlaying(false);
          try { audioRef.current?.pause(); } catch {}
        }
      };
    } catch {}
    const onStorage = (e: StorageEvent) => {
      if (e.key !== BINAURAL_KEY || !e.newValue) return;
      try {
        const d = JSON.parse(e.newValue);
        if (typeof d.playing === "boolean") {
          setPlaying(d.playing);
          if (!d.playing) { try { audioRef.current?.pause(); } catch {} }
        }
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      try { bcRef.current?.close(); } catch {}
    };
  }, []);

  if (!isAdmin) return null;
  if (!hasAudio) return null; // solo aparece cuando ya subiste audio en Estudio

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
          <div className="flex justify-center">
            <button
              onClick={() => {
                if (!audioRef.current) return;
                if (playing) {
                  audioRef.current.pause();
                  setPlaying(false);
                  try { localStorage.setItem(BINAURAL_KEY, JSON.stringify({ playing: false, t: Date.now() })); } catch {}
                  try { bcRef.current?.postMessage({ type: "pause" }); } catch {}
                } else {
                  audioRef.current.play().catch(() => {});
                  setPlaying(true);
                  try { localStorage.setItem(BINAURAL_KEY, JSON.stringify({ playing: true, t: Date.now() })); } catch {}
                  try { bcRef.current?.postMessage({ type: "play" }); } catch {}
                }
              }}
              aria-label={playing ? "Pausar" : "Reproducir"}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "var(--color-gold)",
                color: "var(--color-ink)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
              }}
            >
              {playing ? "⏸" : "▶"}
            </button>
          </div>
          <p style={{ fontSize: "10px", color: "var(--color-text-faint)", marginTop: "8px" }}>En loop · solo vos lo escuchás</p>
        </div>
      )}
    </>
  );
}
