"use client";

import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, X } from "@/components/icons";

function formatHMS(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function playBeep(loop: boolean) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const playTone = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.3, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + dur);
      osc.start(start);
      osc.stop(start + dur);
    };
    const now = ctx.currentTime;
    // Piano-like arpeggio
    playTone(523.25, now, 0.5);
    playTone(659.25, now + 0.15, 0.5);
    playTone(783.99, now + 0.3, 0.8);
    if (loop) {
      setTimeout(() => playBeep(false), 1200);
    }
  } catch {}
}

export default function PomodoroTimer() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(30);
  const [seconds, setSeconds] = useState(0);
  const [title, setTitle] = useState("30 minutos");
  const [loop, setLoop] = useState(false);
  const [totalSec, setTotalSec] = useState(30 * 60);
  const [remaining, setRemaining] = useState(30 * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth > 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Sync totalSec when inputs change and not running
  useEffect(() => {
    if (!running) {
      const t = hours * 3600 + minutes * 60 + seconds;
      setTotalSec(t);
      setRemaining(t);
    }
  }, [hours, minutes, seconds, running]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          // Reached 0
          playBeep(loop);
          if (loop) {
            return totalSec;
          }
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, totalSec, loop]);

  const handleStart = () => {
    const t = hours * 3600 + minutes * 60 + seconds;
    if (t <= 0) return;
    if (!running && remaining !== t) {
      // already has remaining from pause, resume
      setRunning(true);
      return;
    }
    setTotalSec(t);
    setRemaining(t);
    setRunning(true);
  };

  const handlePause = () => setRunning(false);
  const handleReset = () => {
    setRunning(false);
    setRemaining(totalSec);
  };

  const handlePreset = (m: number) => {
    setHours(0);
    setMinutes(m);
    setSeconds(0);
    setTitle(`${m} minutos`);
  };

  const display = running || remaining !== totalSec ? formatHMS(remaining) : formatHMS(totalSec);
  const progress = totalSec > 0 ? (totalSec - remaining) / totalSec : 0;

  if (!isDesktop) return null;

  return (
    <>
      <style>{`@media (max-width: 768px) { .pomodoro-fab { bottom: auto !important; top: 8px !important; right: 8px !important; width: auto !important; height: 26px !important; border-radius: 13px !important; padding: 0 8px !important; font-size: 9px !important; opacity: 0.85; gap: 4px; } .pomodoro-panel { bottom: auto !important; top: 42px !important; right: 8px !important; border-radius: 0 !important; max-height: calc(100dvh - 56px) !important; overflow-y: auto !important; } .pomodoro-panel input[type="number"], .pomodoro-panel input[type="text"] { font-size: 12px !important; padding: 6px !important; } .pomodoro-panel .pom-digital { font-size: 24px !important; padding: 12px 10px !important; } } @media (min-width: 769px) { .pomodoro-panel { border-radius: 12px !important; overflow: hidden; width: 260px !important; padding: 14px !important; top: 80px !important; bottom: auto !important; } .pomodoro-panel .pom-digital { font-size: 24px !important; padding: 12px !important; } .pomodoro-panel .pom-digital .pom-time { font-size: 22px !important; } .pomodoro-panel input[type="number"], .pomodoro-panel input[type="text"] { font-size: 12px !important; padding: 6px !important; } .pomodoro-fab { opacity: 0.72; } .pomodoro-fab:hover { opacity: 1; } }`}</style>
      {/* Floating button — desktop: flotante abajo; mobile: pill compacto arriba */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Temporizador"
        title="Temporizador"
        className="pomodoro-fab"
        style={{
          position: "fixed",
          bottom: "88px",
          right: "20px",
          zIndex: 90,
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          background: running ? "var(--color-gold)" : "rgba(24,24,28,0.72)",
          border: `1px solid ${running ? "var(--color-gold)" : "rgba(185,154,98,0.28)"}`,
          color: running ? "var(--color-ink)" : "var(--color-gold)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
          backdropFilter: "blur(6px)",
          transition: "all 0.2s ease",
          fontFamily: "var(--font-ibm-plex-mono)",
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.04em",
        }}
      >
        {running ? display.slice(3) : "⏱"}
      </button>

      {/* Panel — más sutil en desktop */}
      {open && (
          <div
          className="pomodoro-panel"
          style={{
            position: "fixed",
            bottom: "150px",
            right: "20px",
            zIndex: 90,
            width: "min(300px, calc(100vw - 16px))",
            background: "var(--color-card)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderTop: "1px solid rgba(185,154,98,0.25)",
            padding: "16px",
            borderRadius: 0,
            boxShadow: "0 16px 40px rgba(0,0,0,0.32), 0 2px 8px rgba(0,0,0,0.2)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: "16px" }}>
            <h3
              style={{
                fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                fontWeight: 500,
                fontSize: "18px",
                color: "var(--color-text)",
                margin: 0,
              }}
            >
              Temporizador
            </h3>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)", padding: "4px" }}
            >
              <X style={{ width: "16px", height: "16px" }} />
            </button>
          </div>

          {/* Digital display — más delicado */}
          <div
            className="pom-digital"
            style={{
              background: "rgba(5,7,12,0.6)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "12px",
              padding: "18px 16px",
              textAlign: "center",
              marginBottom: "18px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                height: "2px",
                width: `${progress * 100}%`,
                background: "var(--color-gold)",
                transition: "width 1s linear",
              }}
            />
            <p
              className="pom-time"
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "32px",
                letterSpacing: "0.08em",
                color: running ? "var(--color-gold)" : "var(--color-text)",
                margin: 0,
                fontWeight: 500,
              }}
            >
              {display}
            </p>
            {title && (
              <p style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "11px", color: "var(--color-text-faint)", marginTop: "4px" }}>
                {title}
              </p>
            )}
            <div className="flex items-center justify-center gap-2" style={{ marginTop: "12px" }}>
              {!running ? (
                <button
                  onClick={handleStart}
                  disabled={totalSec <= 0 && remaining <= 0}
                  style={{
                    padding: "8px 18px",
                    background: "var(--color-gold)",
                    color: "var(--color-ink)",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "var(--font-ibm-plex-mono)",
                    fontSize: "11px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    opacity: totalSec <= 0 && remaining <= 0 ? 0.4 : 1,
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    <Play style={{ width: "12px", height: "12px" }} /> Iniciar
                  </span>
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  style={{
                    padding: "8px 18px",
                    background: "transparent",
                    color: "var(--color-gold)",
                    border: "1px solid var(--color-gold-dim)",
                    cursor: "pointer",
                    fontFamily: "var(--font-ibm-plex-mono)",
                    fontSize: "11px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    <Pause style={{ width: "12px", height: "12px" }} /> Pausar
                  </span>
                </button>
              )}
              <button
                onClick={handleReset}
                style={{
                  padding: "8px 14px",
                  background: "transparent",
                  color: "var(--color-text-muted)",
                  border: "1px solid var(--color-line)",
                  cursor: "pointer",
                  fontFamily: "var(--font-ibm-plex-mono)",
                  fontSize: "11px",
                }}
                title="Reiniciar"
              >
                <RotateCcw style={{ width: "12px", height: "12px" }} />
              </button>
            </div>
          </div>

          {/* Config */}
          <div style={{ opacity: running ? 0.5 : 1, pointerEvents: running ? "none" : "auto" }}>
            <label style={{ display: "block", fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-faint)", marginBottom: "8px" }}>
              Duración
            </label>
            <div className="flex gap-2" style={{ marginBottom: "12px" }}>
              <div className="flex-1">
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={hours}
                  onChange={(e) => setHours(Math.max(0, Math.min(23, Number(e.target.value) || 0)))}
                  style={{
                    width: "100%",
                    background: "var(--color-ink)",
                    border: "1px solid var(--color-line-soft)",
                    padding: "8px",
                    fontSize: "14px",
                    color: "var(--color-text)",
                    textAlign: "center",
                    fontFamily: "var(--font-ibm-plex-mono)",
                  }}
                />
                <p style={{ fontSize: "10px", color: "var(--color-text-faint)", textAlign: "center", marginTop: "4px" }}>Horas</p>
              </div>
              <div className="flex-1">
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
                  style={{
                    width: "100%",
                    background: "var(--color-ink)",
                    border: "1px solid var(--color-line-soft)",
                    padding: "8px",
                    fontSize: "14px",
                    color: "var(--color-text)",
                    textAlign: "center",
                    fontFamily: "var(--font-ibm-plex-mono)",
                  }}
                />
                <p style={{ fontSize: "10px", color: "var(--color-text-faint)", textAlign: "center", marginTop: "4px" }}>Min</p>
              </div>
              <div className="flex-1">
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={seconds}
                  onChange={(e) => setSeconds(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
                  style={{
                    width: "100%",
                    background: "var(--color-ink)",
                    border: "1px solid var(--color-line-soft)",
                    padding: "8px",
                    fontSize: "14px",
                    color: "var(--color-text)",
                    textAlign: "center",
                    fontFamily: "var(--font-ibm-plex-mono)",
                  }}
                />
                <p style={{ fontSize: "10px", color: "var(--color-text-faint)", textAlign: "center", marginTop: "4px" }}>Seg</p>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap" style={{ marginBottom: "12px" }}>
              {[5, 15, 25, 30, 45].map((m) => (
                <button
                  key={m}
                  onClick={() => handlePreset(m)}
                  style={{
                    padding: "6px 10px",
                    fontSize: "11px",
                    fontFamily: "var(--font-ibm-plex-mono)",
                    background: "transparent",
                    border: "1px solid var(--color-line)",
                    color: "var(--color-text-muted)",
                    cursor: "pointer",
                  }}
                >
                  {m}m
                </button>
              ))}
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-faint)", marginBottom: "6px" }}>
                Título
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Estudio Contratos"
                style={{
                  width: "100%",
                  background: "var(--color-ink)",
                  border: "1px solid var(--color-line-soft)",
                  padding: "8px 10px",
                  fontSize: "13px",
                  color: "var(--color-text)",
                  fontFamily: "var(--font-inter)",
                }}
              />
            </div>

            <label className="flex items-center gap-2" style={{ cursor: "pointer", fontFamily: "var(--font-ibm-plex-mono)", fontSize: "12px", color: "var(--color-text-muted)" }}>
              <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} />
              Repetir al terminar (loop)
            </label>
          </div>
        </div>
      )}
    </>
  );
}
