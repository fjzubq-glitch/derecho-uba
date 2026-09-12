"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, RotateCcw, X } from "@/components/icons";

function formatHMS(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatLabel(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h} hora${h !== 1 ? "s" : ""}`;
  return `${m} min`;
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
    const chords = [
      [523.25, 659.25, 783.99],
      [587.33, 739.99, 880.00],
      [659.25, 783.99, 987.77],
      [698.46, 880.00, 1046.50],
    ];
    chords.forEach((chord, i) => {
      const t = now + i * 0.5;
      chord.forEach((freq) => pianoNote(freq, t, 0.8));
    });
  } catch {}
}

const POMO_KEY = "pomodoro_shared";

function readPomoShared() {
  try {
    const raw = localStorage.getItem(POMO_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { running: boolean; endTime: number; totalSec: number; remaining: number };
  } catch { return null; }
}
function writePomoShared(data: { running: boolean; endTime: number; totalSec: number; remaining: number }) {
  try { localStorage.setItem(POMO_KEY, JSON.stringify(data)); } catch {}
}

const PRESETS = [5, 15, 25, 30, 45];

export default function PomodoroTimer() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(30);
  const [seconds, setSeconds] = useState(0);
  const [title, setTitle] = useState("");
  const [totalSec, setTotalSec] = useState(30 * 60);
  const [remaining, setRemaining] = useState(30 * 60);
  const [running, setRunning] = useState(false);
  const endTimeRef = useRef<number>(0);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const fabRef = useRef<HTMLButtonElement | null>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth > 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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

  const tick = useCallback(() => {
    const now = Date.now();
    const left = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
    setRemaining(left);
    if (left <= 0) {
      playBeepSequence();
      setRunning(false);
      writePomoShared({ running: false, endTime: 0, totalSec, remaining: 0 });
      try { bcRef.current?.postMessage({ type: "reset", totalSec }); } catch {}
      try {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Pomodoro terminado", { body: title || "Tiempo cumplido" });
        } else if ("Notification" in window && Notification.permission !== "denied") {
          Notification.requestPermission().then((p) => {
            if (p === "granted") new Notification("Pomodoro terminado", { body: title || "Tiempo cumplido" });
          });
        }
      } catch {}
    }
  }, [totalSec, title]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) { window.clearInterval(intervalRef.current); intervalRef.current = null; }
      if (timeoutRef.current) { window.clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      return;
    }
    tick();
    intervalRef.current = window.setInterval(tick, 500);
    const delay = Math.max(0, endTimeRef.current - Date.now());
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => tick(), delay);
    return () => {
      if (intervalRef.current) { window.clearInterval(intervalRef.current); intervalRef.current = null; }
      if (timeoutRef.current) { window.clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    };
  }, [running, totalSec, tick]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        const shared = readPomoShared();
        if (shared && shared.running && shared.endTime > Date.now()) {
          endTimeRef.current = shared.endTime;
          setTotalSec(shared.totalSec);
          setRemaining(Math.max(0, Math.ceil((shared.endTime - Date.now()) / 1000)));
          setRunning(true);
        } else if (running) { tick(); }
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [running, tick]);

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

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || fabRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const handleStart = () => {
    const t = hours * 3600 + minutes * 60 + seconds;
    if (t <= 0) return;
    if (!running && remaining > 0 && remaining !== t) {
      const end = Date.now() + remaining * 1000;
      endTimeRef.current = end;
      setRunning(true);
      writePomoShared({ running: true, endTime: end, totalSec, remaining });
      try { bcRef.current?.postMessage({ type: "start", endTime: end, totalSec, remaining }); } catch {}
      return;
    }
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
  const subtitle = running || remaining !== totalSec ? formatLabel(remaining) : formatLabel(totalSec);
  const selectedPreset = PRESETS.find((m) => hours === 0 && minutes === m && seconds === 0 && !running);

  if (!isDesktop) return null;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: "34px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "8px",
    padding: "0",
    textAlign: "center",
    fontFamily: "var(--font-ibm-plex-mono)",
    fontSize: "13px",
    color: "var(--color-text)",
    outline: "none",
  };

  return (
    <>
      {/* Boton mini */}
      <button
        ref={fabRef}
        onClick={() => setOpen((v) => !v)}
        aria-label="Temporizador"
        title="Temporizador"
        style={{
          position: "fixed",
          bottom: "48px",
          right: "24px",
          zIndex: 91,
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          background: running ? "rgba(185,154,98,0.18)" : "rgba(24,24,28,0.5)",
          border: "1px solid rgba(185,154,98,0.18)",
          color: running ? "#D9B77E" : "var(--color-text-faint)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          backdropFilter: "blur(6px)",
          fontSize: "11px",
          transition: "background 0.2s ease, border-color 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(185,154,98,0.4)";
          e.currentTarget.style.background = "rgba(185,154,98,0.22)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(185,154,98,0.18)";
          e.currentTarget.style.background = running ? "rgba(185,154,98,0.18)" : "rgba(24,24,28,0.5)";
        }}
      >
        <span style={{ position: "relative" }}>
          &#9201;
          {running && (
            <span style={{
              position: "absolute", top: "-1px", right: "-3px",
              width: "6px", height: "6px", borderRadius: "50%",
              background: "#5DCAA5", boxShadow: "0 0 4px #5DCAA5",
            }} />
          )}
        </span>
      </button>

      {open && (
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            bottom: "88px",
            right: "24px",
            zIndex: 90,
            width: "260px",
            borderRadius: "16px",
            background: "linear-gradient(160deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
            border: "1px solid rgba(185,154,98,0.18)",
            padding: "18px",
            backdropFilter: "blur(6px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h3 style={{
              fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
              fontWeight: 500, fontSize: "14px", color: "#F2F0E9", margin: 0,
            }}>
              Temporizador
            </h3>
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#6A6E7C", padding: "4px" }}
            >
              <X style={{ width: "14px", height: "14px" }} />
            </button>
          </div>

          {/* Display */}
          <div style={{
            textAlign: "center", padding: "16px 12px", marginBottom: "16px",
            background: "rgba(5,7,12,0.5)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", bottom: 0, left: 0, height: "2px",
              width: `${totalSec > 0 ? ((totalSec - remaining) / totalSec) * 100 : 0}%`,
              background: "#B99A62", transition: "width 1s linear",
            }} />
            <p style={{
              fontFamily: "var(--font-ibm-plex-mono)", fontSize: "30px",
              letterSpacing: "0.02em", color: "#F2F0E9", margin: 0,
            }}>
              {display}
            </p>
            <p style={{
              fontFamily: "var(--font-inter)", fontWeight: 300, fontSize: "11px",
              color: "var(--color-text-faint)", marginTop: "4px",
            }}>
              {subtitle}
            </p>
          </div>

          {/* Botones Iniciar / Reiniciar */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
            <button
              onClick={running ? handlePause : handleStart}
              disabled={!running && totalSec <= 0 && remaining <= 0}
              style={{
                flex: 1, height: "36px", borderRadius: "8px",
                background: "transparent", border: "1px solid #B99A62",
                color: "#D9B77E", fontFamily: "var(--font-inter)",
                fontWeight: 400, fontSize: "12px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                opacity: !running && totalSec <= 0 && remaining <= 0 ? 0.4 : 1,
                transition: "border-color 0.2s ease, color 0.2s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#D9B77E"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#B99A62"; }}
            >
              {running
                ? <><Pause style={{ width: "12px", height: "12px" }} /> Pausar</>
                : <><Play style={{ width: "12px", height: "12px" }} /> Iniciar</>}
            </button>
            <button
              onClick={handleReset}
              aria-label="Reiniciar"
              title="Reiniciar"
              style={{
                width: "36px", height: "36px", borderRadius: "8px",
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                color: "#8A8E9C", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <RotateCcw style={{ width: "14px", height: "14px" }} />
            </button>
          </div>

          {/* Chips de duracion rapida */}
          <div style={{ display: "flex", gap: "6px", marginBottom: running ? undefined : "14px", opacity: running ? 0.4 : 1, pointerEvents: running ? "none" : "auto" }}>
            {PRESETS.map((m) => (
              <button
                key={m}
                onClick={() => handlePreset(m)}
                style={{
                  flex: 1, height: "26px", borderRadius: "20px",
                  fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px",
                  background: selectedPreset === m ? "rgba(185,154,98,0.1)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${selectedPreset === m ? "rgba(185,154,98,0.3)" : "rgba(255,255,255,0.07)"}`,
                  color: selectedPreset === m ? "#D9B77E" : "#8A8E9C",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {m}m
              </button>
            ))}
          </div>

          {/* Ajuste manual colapsable */}
          {!running && (
            <details style={{ opacity: running ? 0.4 : 1, pointerEvents: running ? "none" : "auto" }}>
              <summary style={{
                borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "10px",
                fontFamily: "var(--font-ibm-plex-mono)", fontSize: "9px",
                letterSpacing: "0.12em", textTransform: "uppercase",
                color: "#6A6E7C", cursor: "pointer", listStyle: "none",
                display: "flex", alignItems: "center", gap: "6px",
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Ajustar manualmente
              </summary>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginTop: "10px" }}>
                {[
                  { label: "Hs", value: hours, max: 23, set: setHours },
                  { label: "Min", value: minutes, max: 59, set: setMinutes },
                  { label: "Seg", value: seconds, max: 59, set: setSeconds },
                ].map((f) => (
                  <div key={f.label}>
                    <input
                      type="number"
                      min={0}
                      max={f.max}
                      value={f.value}
                      onChange={(e) => f.set(Math.max(0, Math.min(f.max, Number(e.target.value) || 0)))}
                      style={inputStyle}
                    />
                    <p style={{
                      fontFamily: "var(--font-ibm-plex-mono)", fontSize: "8px",
                      letterSpacing: "0.1em", textTransform: "uppercase",
                      color: "#6A6E7C", textAlign: "center", marginTop: "4px",
                    }}>
                      {f.label}
                    </p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </>
  );
}
