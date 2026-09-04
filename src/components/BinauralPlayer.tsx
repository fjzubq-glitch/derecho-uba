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

  const panelRef = useRef<HTMLDivElement | null>(null);
  const fabRef = useRef<HTMLButtonElement | null>(null);

  // Cerrar al clickear afuera (también cierra Pomodoro si está abierto via evento)
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || fabRef.current?.contains(t)) return;
      setOpen(false);
      try { window.dispatchEvent(new CustomEvent("close-floating-panels")); } catch {}
    };
    document.addEventListener("mousedown", onClickOutside);
    const onCloseAll = () => setOpen(false);
    window.addEventListener("close-floating-panels" as never, onCloseAll as never);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("close-floating-panels" as never, onCloseAll as never);
    };
  }, [open]);

  if (!hasAudio) return null;

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
        ref={fabRef}
        onClick={() => {
          const n = !open;
          setOpen(n);
          if (n) { try { window.dispatchEvent(new CustomEvent("close-floating-panels-pomo")); } catch {} }
        }}
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

      <style>{`@keyframes binauralWave { 0%,100% { transform: scaleY(0.5); opacity: 0.6; } 50% { transform: scaleY(1); opacity: 1; } } .bw-bar { width: 2px; background: #7B8CFF; border-radius: 1px; display: inline-block; transform-origin: center; }`}</style>
      {open && (
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            bottom: "88px",
            left: "24px",
            zIndex: 90,
            width: "220px",
            background: "rgba(24,24,28,0.88)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "14px",
            padding: "10px 10px 12px",
            backdropFilter: "blur(8px)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
          }}
        >
          <p style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-text-faint)", textAlign: "center", marginBottom: "8px" }}>
            Música binaural
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div className="flex items-center" style={{ flex: 1, height: "28px", gap: "2px", justifyContent: "center" }}>
            {Array.from({ length: 36 }).map((_, i) => {
              const h = [4, 6, 8, 12, 16, 20, 14, 9, 5, 7, 11, 15, 18, 13, 8, 4, 6, 10, 12, 16, 22, 18, 12, 7, 4, 6, 9, 13, 17, 12, 8, 5, 7, 10, 14, 9][i] || 6;
              return (
                <span
                  key={i}
                  className="bw-bar"
                  style={{
                    height: `${h}px`,
                    animation: playing ? `binauralWave 0.7s ease-in-out ${i * 0.04}s infinite` : "none",
                    opacity: playing ? 0.9 : 0.32,
                  }}
                />
              );
            })}
          </div>
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
              width: "26px",
              height: "26px",
              borderRadius: "50%",
              background: "var(--color-gold)",
              color: "var(--color-ink)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10px",
              flexShrink: 0,
            }}
          >
            {playing ? "⏸" : "▶"}
          </button>
          </div>
        </div>
      )}
    </>
  );
}
