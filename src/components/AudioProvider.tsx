"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { saveResumeTime, getResumeTime, clearResumeTime } from "@/lib/utils";
import { trackActivity, isAdminUser } from "@/lib/tracking";
import { getPortalUserName } from "@/lib/portalUser";

export interface AudioTrack {
  id: string;
  nombre: string;
  tipo: string;
  src: string;
  materiaSlug: string;
  claseNumero: number;
  durationGuess?: number;
}

interface AudioContextValue {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  play: (track: AudioTrack) => void;
  togglePlay: () => void;
  seek: (t: number) => void;
  cycleSpeed: () => void;
  restart: () => void;
  stop: () => void;
}

const AudioContext = createContext<AudioContextValue | null>(null);

export function useAudio(): AudioContextValue {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error("useAudio debe usarse dentro de AudioProvider");
  return ctx;
}

const SPEEDS = [1, 1.25, 1.5, 2];

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const trackRef = useRef<AudioTrack | null>(null);
  const playTrackedRef = useRef<string | null>(null);
  const playbackRateRef = useRef(1);

  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [visible, setVisible] = useState(false);

  // Padding en el body para que la barra fija no tape el footer
  useEffect(() => {
    document.body.classList.toggle("has-global-player", visible);
    return () => document.body.classList.remove("has-global-player");
  }, [visible]);

  // Listeners del elemento <audio> (montan una sola vez)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      const t = trackRef.current;
      if (t) saveResumeTime(t.id, audio.currentTime);
    };
    const onDurationChange = () => {
      setDuration(audio.duration);
      const t = trackRef.current;
      if (t && Number.isFinite(audio.duration) && audio.duration > 0) {
        fetch("/api/stream/" + t.id, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ duration: Math.round(audio.duration) }),
        }).catch(() => {});
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      const t = trackRef.current;
      if (t) clearResumeTime(t.id);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const play = useCallback((track: AudioTrack) => {
    const audio = audioRef.current;
    if (!audio) return;

    const prev = trackRef.current;
    if (prev && prev.src.startsWith("blob:")) {
      URL.revokeObjectURL(prev.src);
    }

    trackRef.current = track;
    playTrackedRef.current = null;
    setCurrentTrack(track);
    setVisible(true);
    setCurrentTime(0);
    setDuration(track.durationGuess || 0);
    setIsPlaying(false);

    audio.src = track.src;
    audio.playbackRate = playbackRateRef.current;

    const resumeAt = getResumeTime(track.id);
    const applyResume = () => {
      if (resumeAt > 15) {
        try {
          audio.currentTime = resumeAt;
          setCurrentTime(resumeAt);
        } catch {
          // metadata todavía no lista: ignorar
        }
      }
    };

    const onMeta = () => {
      applyResume();
      audio.removeEventListener("loadedmetadata", onMeta);
    };
    audio.addEventListener("loadedmetadata", onMeta);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    const track = trackRef.current;
    if (!audio || !track) return;

    if (!audio.paused) {
      audio.pause();
      return;
    }

    if (playTrackedRef.current !== track.id) {
      playTrackedRef.current = track.id;
      if (!isAdminUser()) {
        fetch("/api/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archivo_id: track.id, usuario: getPortalUserName() }),
        }).catch(() => {});
      }
      trackActivity({
        tipo: "play_start",
        pagina: "clase_detalle",
        materia_slug: track.materiaSlug,
        archivo_id: track.id,
      });
    }

    audio.play().catch(() => {});
  }, []);

  const seek = useCallback((t: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = t;
    setCurrentTime(t);
  }, []);

  const cycleSpeed = useCallback(() => {
    setPlaybackRate((prev) => {
      const i = SPEEDS.indexOf(prev);
      const next = SPEEDS[(i + 1) % SPEEDS.length];
      playbackRateRef.current = next;
      return next;
    });
  }, []);

  const restart = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrentTime(0);
    const t = trackRef.current;
    if (t) clearResumeTime(t.id);
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    const prev = trackRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    if (prev && prev.src.startsWith("blob:")) {
      URL.revokeObjectURL(prev.src);
    }
    trackRef.current = null;
    setCurrentTrack(null);
    setVisible(false);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  }, []);

  // Aplicar velocidad al elemento real
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  const value: AudioContextValue = {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    play,
    togglePlay,
    seek,
    cycleSpeed,
    restart,
    stop,
  };

  return (
    <AudioContext.Provider value={value}>
      <audio ref={audioRef} preload="metadata" />
      {children}
    </AudioContext.Provider>
  );
}
