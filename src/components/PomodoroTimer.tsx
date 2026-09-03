"use client";

import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, X } from "@/components/icons";

function formatHMS(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function playBeepSequence() {
  playBeepCore();
  setTimeout(() => playBeepCore(), 2500);
  setTimeout(() => playBeepCore(), 5000);
}

function playBeepCore() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    const pianoNote = (freq: number, start: number, dur: number, vol = 0.6) => {
      // Seno fundamental
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.value = freq;
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      gain1.gain.setValueAtTime(0, start);
      gain1.gain.linearRampToValueAtTime(vol, start + 0.005);
      gain1.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc1.start(start);
      osc1.stop(start + dur);

      // Armónico cuadrada (riqueza del piano)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "square";
      osc2.frequency.value = freq * 2;
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      gain2.gain.setValueAtTime(0, start);
      gain2.gain.linearRampToValueAtTime(vol * 0.15, start + 0.003);
      gain2.gain.exponentialRampToValueAtTime(0.001, start + dur * 0.6);
      osc2.start(start);
      osc2.stop(start + dur);
    };

    const now = ctx.currentTime;
    // 4 acordes tipo piano, cada 0.5s
    const chords = [
      [523.25, 659.25, 783.99],  // Do-Mi-Sol
      [587.33, 739.99, 880.00],  // Re-Fa#-La
      [659.25, 783.99, 987.77],  // Mi-Sol-Si
      [698.46, 880.00, 1046.50], // Fa-La-Do (octava alta)
    ];
    chords.forEach((chord, i) => {
      const t = now + i * 0.5;
      chord.forEach((freq) => pianoNote(freq, t, 0.8));
    });
  } catch {}
}

const POMO_KEY = "pomodoro_shared";

function readPomoShared(): { running: boolean; endTime: number; totalSec: number; remaining: number } | null {
  try {
    const raw = localStorage.getItem(POMO_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function writePomoShared(data: { running: boolean; endTime: number; totalSec: number; remaining: number }) {
  try { localStorage.setItem(POMO_KEY, JSON.stringify(data)); } catch {}
}

export default function PomodoroTimer() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(30);
  const [seconds, setSeconds] = useState(0);
  const [title, setTitle] = useState("30 minutos");
  const [totalSec, setTotalSec] = useState(30 * 60);
  const [remaining, setRemaining] = useState(30 * 60);
  const [running, setRunning] = useState(false);
  const endTimeRef = useRef<number>(0);
  const intervalRef = useRef<number | null>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth > 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Sync remaining with inputs ONLY when inputs change and timer hasn't started yet
  const prevInputsRef = useRef(`${hours}:${minutes}:${seconds}`);
  useEffect(() => {
    const key = `${hours}:${minutes}:${seconds}`;
    if (key !== prevInputsRef.current) {
      prevInputsRef.current = key;
      if (!running) {
        const t = hours * 3600 + minutes * 60 + seconds;
        setTotalSec(t);
        setRemaining(t);
      }
    }
  }, [hours, minutes, seconds, running]);

  const tick = () => {
    const now = Date.now();
    const left = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
    setRemaining(left);
    if (left <= 0) {
      if (document.visibilityState === "visible") playBeepSequence();
      setRunning(false);
      writePomoShared({ running: false, endTime: 0, totalSec, remaining: 0 });
      try { bcRef.current?.postMessage({ type: "reset", totalSec }); } catch {}
    }
  };

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    // Recalc immediately in case we just resumed from background
    tick();
    intervalRef.current = window.setInterval(tick, 500);
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, totalSec]);

  // Also catch visibility change so timer snaps when user returns to tab
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && running) {
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [running]);

  // Sincronización entre pestañas (mismo flotante, led y control)
  useEffect(() => {
    const shared = readPomoShared();
    if (shared && shared.running && shared.endTime > Date.now()) {
      endTimeRef.current = shared.endTime;
      setTotalSec(shared.totalSec);
      setRemaining(Math.max(0, Math.ceil((shared.endTime - Date.now()) / 1000)));
      setRunning(true);
    }
    try {
      bcRef.current = new BroadcastChannel("pomodoro");
      bcRef.current.onmessage = (e: MessageEvent) => {
        const d = e.data as { type: string; endTime?: number; totalSec?: number; remaining?: number };
        if (d?.type === "start" && d.endTime) {
          endTimeRef.current = d.endTime;
          if (typeof d.totalSec === "number") setTotalSec(d.totalSec);
          if (typeof d.remaining === "number") setRemaining(d.remaining);
          else setRemaining(Math.max(0, Math.ceil((d.endTime - Date.now()) / 1000)));
          setRunning(true);
        } else if (d?.type === "pause") {
          setRunning(false);
          if (typeof d.remaining === "number") setRemaining(d.remaining);
        } else if (d?.type === "reset" && typeof d.totalSec === "number") {
          setRunning(false);
          setTotalSec(d.totalSec);
          setRemaining(d.totalSec);
        }
      };
    } catch {}
    const onStorage = (e: StorageEvent) => {
      if (e.key !== POMO_KEY || !e.newValue) return;
      try {
        const d = JSON.parse(e.newValue);
        if (d.running && d.endTime > Date.now()) {
          endTimeRef.current = d.endTime;
          if (typeof d.totalSec === "number") setTotalSec(d.totalSec);
          setRemaining(Math.max(0, Math.ceil((d.endTime - Date.now()) / 1000)));
          setRunning(true);
        } else {
          setRunning(false);
          if (typeof d.remaining === "number") setRemaining(d.remaining);
          if (typeof d.totalSec === "number") setTotalSec(d.totalSec);
        }
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      try { bcRef.current?.close(); } catch {}
    };
  }, []);

  const handleStart = () => {
    const t = hours * 3600 + minutes * 60 + seconds;
    if (t <= 0) return;
    if (!running && remaining > 0 && remaining !== t) {
      // Resume from pause
      const end = Date.now() + remaining * 1000;
      endTimeRef.current = end;
      setRunning(true);
      writePomoShared({ running: true, endTime: end, totalSec, remaining });
      try { bcRef.current?.postMessage({ type: "start", endTime: end, totalSec, remaining }); } catch {}
      return;
    }
    // Fresh start
    const end = Date.now() + t * 1000;
    setTotalSec(t);
    setRemaining(t);
    endTimeRef.current = end;
    setRunning(true);
    writePomoShared({ running: true, endTime: end, totalSec: t, remaining: t });
    try { bcRef.current?.postMessage({ type: "start", endTime: end, totalSec: t, remaining: t }); } catch {}
  };

  const handlePause = () => {
    setRunning(false);
    writePomoShared({ running: false, endTime: 0, totalSec, remaining });
    try { bcRef.current?.postMessage({ type: "pause", remaining }); } catch {}
  };
  const handleReset = () => {
    setRunning(false);
    setRemaining(totalSec);
    writePomoShared({ running: false, endTime: 0, totalSec, remaining: totalSec });
    try { bcRef.current?.postMessage({ type: "reset", totalSec }); } catch {}
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
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Temporizador"
        title="Temporizador"
        className="pomodoro-fab"
        style={{
          position: "fixed",
          bottom: "48px",
          right: "24px",
          zIndex: 90,
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          background: running ? "rgba(185,154,98,0.15)" : "rgba(24,24,28,0.5)",
          border: "1px solid rgba(185,154,98,0.15)",
          color: "var(--color-text-faint)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          backdropFilter: "blur(6px)",
          transition: "all 0.2s ease",
          fontSize: "11px",
        }}
      >
        <span style={{ position: "relative" }}>
          ⏱
          {running && (
            <span style={{
              position: "absolute",
              top: "-1px",
              right: "-3px",
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#22c55e",
              boxShadow: "0 0 4px #22c55e",
            }} />
          )}
        </span>
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

            <div className="flex gap-1.5" style={{ marginBottom: "12px" }}>
              {[5, 15, 25, 30, 45].map((m) => (
                <button
                  key={m}
                  onClick={() => handlePreset(m)}
                  style={{
                    padding: "5px 6px",
                    fontSize: "10px",
                    fontFamily: "var(--font-ibm-plex-mono)",
                    background: "transparent",
                    border: "1px solid var(--color-line)",
                    color: "var(--color-text-muted)",
                    cursor: "pointer",
                    flex: "1 1 0",
                    minWidth: 0,
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
          </div>
        </div>
      )}
    </>
  );
}
