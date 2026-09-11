"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause } from "@/components/icons";

const BAR_COUNT = 20;
const BAR_WIDTH = 2;
const BAR_GAP = 3;
const MIN_H = 4;
const MAX_H = 16;
const ANIM_INTERVAL = 120;

export default function BinauralPlayer() {
  const [hasAudio, setHasAudio] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const barsRef = useRef<HTMLDivElement[]>([]);
  const BINAURAL_KEY = "binaural_shared";

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    fetch("/api/admin/binaural")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.ok && d?.binaural) setHasAudio(true);
      })
      .catch(() => {});
  }, []);

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

  const stopAnimation = useCallback(() => {
    if (animRef.current) { clearInterval(animRef.current); animRef.current = null; }
    barsRef.current.forEach((b) => {
      if (b) { b.style.height = `${MIN_H}px`; b.style.opacity = "0.3"; }
    });
  }, []);

  const startAnimation = useCallback(() => {
    if (animRef.current) clearInterval(animRef.current);
    let tick = 0;
    animRef.current = setInterval(() => {
      tick++;
      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        const phase = (i / BAR_COUNT) * Math.PI * 2;
        const t = tick * 0.15;
        const norm = (Math.sin(t + phase) + 1) / 2;
        const h = MIN_H + norm * (MAX_H - MIN_H);
        const opacity = 0.35 + norm * 0.5;
        bar.style.height = `${h}px`;
        bar.style.opacity = String(opacity);
      });
    }, ANIM_INTERVAL);
  }, []);

  useEffect(() => {
    if (playing) startAnimation();
    else stopAnimation();
    return () => { if (animRef.current) clearInterval(animRef.current); };
  }, [playing, startAnimation, stopAnimation]);

  useEffect(() => {
    return () => { if (animRef.current) clearInterval(animRef.current); };
  }, []);

  const togglePlay = () => {
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
  };

  if (!hasAudio || isMobile) return null;

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
      <div
        style={{
          position: "fixed",
          bottom: "48px",
          left: "24px",
          zIndex: 90,
          borderRadius: "16px",
          background: "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
          border: "1px solid rgba(185,154,98,0.2)",
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          backdropFilter: "blur(6px)",
        }}
      >
        <button
          onClick={togglePlay}
          aria-label={playing ? "Pausar" : "Reproducir"}
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "50%",
            background: "rgba(185,154,98,0.12)",
            border: "1px solid rgba(185,154,98,0.4)",
            color: "#D9B77E",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            transition: "background 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(185,154,98,0.22)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(185,154,98,0.12)")}
        >
          {playing
            ? <Pause style={{ width: "14px", height: "14px" }} />
            : <Play style={{ width: "14px", height: "14px" }} />}
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#6A6E7C" }}>
            Sonido binaural
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: `${BAR_GAP}px`, height: `${MAX_H}px` }}>
            {Array.from({ length: BAR_COUNT }).map((_, i) => (
              <div
                key={i}
                ref={(el) => { if (el) barsRef.current[i] = el; }}
                style={{
                  width: `${BAR_WIDTH}px`,
                  height: `${MIN_H}px`,
                  borderRadius: "2px",
                  background: "#B99A62",
                  opacity: 0.3,
                  transition: "height 0.1s ease, opacity 0.1s ease",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
