"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { trackActivity } from "@/lib/tracking";
import GlassCard from "@/components/ui/GlassCard";
import { ArrowLeft, Calendar, Play, ExternalLink, Headphones, FileText } from "@/components/icons";
import { formatDuration, getYouTubeThumbnail } from "@/lib/utils";

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

export default function ClaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const materiaSlug = params.materia as string;
  const claseId = params.clase as string;

  const [clase, setClase] = useState<{
    id: string;
    numero: number;
    titulo: string;
    fecha: string | null;
    archivos: Archivo[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [playingAudio, setPlayingAudio] = useState<{ src: string; title: string } | null>(null);

  useEffect(() => {
    if (claseId) {
      loadClase();
      trackActivity({ tipo: "page_view", pagina: "clase", materia_slug: materiaSlug, clase_id: claseId });
    }
  }, [claseId]);

  async function loadClase() {
    const { data: claseData, error } = await supabase
      .from("clases")
      .select(`
        id, 
        numero, 
        titulo, 
        fecha,
        archivos (
          id,
          tipo,
          nombre_display,
          storage_key,
          youtube_url,
          contenido_texto,
          duration_seconds,
          play_count
        )
      `)
      .eq("id", claseId)
      .single();

    if (claseData) {
      setClase(claseData);
    }
    setLoading(false);
  }

  async function playAudio(archivo: Archivo) {
    if (archivo.youtube_url) {
      window.open(archivo.youtube_url, "_blank");
      trackActivity({ tipo: "youtube_open", pagina: "clase", materia_slug: materiaSlug, clase_id: claseId, archivo_id: archivo.id });
      return;
    }

    const res = await fetch(`/api/stream/${archivo.id}`);
    const data = await res.json();

    if (data.url) {
      setPlayingAudio({ src: data.url, title: archivo.nombre_display });

      await supabase.rpc("increment_play_count", { file_id: archivo.id });
      trackActivity({ tipo: "play_start", pagina: "clase", materia_slug: materiaSlug, clase_id: claseId, archivo_id: archivo.id });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      <header className="border-b border-white/[0.08] bg-[rgba(10,10,20,0.8)] backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push(`/dashboard/${materiaSlug}`)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">
              Clase {clase?.numero.toString().padStart(2, "0")}
            </h1>
            <p className="text-sm text-gray-400">
              {clase?.fecha && new Date(clase.fecha).toLocaleDateString("es-AR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <GlassCard className="p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">{clase?.titulo}</h2>
          <div className="flex items-center gap-2 text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>Clase {clase?.numero}</span>
          </div>
        </GlassCard>

        <div className="space-y-4">
          {clase?.archivos.map((archivo) => {
            const isYouTube = archivo.tipo === "youtube" || archivo.youtube_url;

            return (
              <GlassCard key={archivo.id} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-2 py-1 rounded-md bg-violet-500/20 text-violet-300">
                      {archivo.tipo.replace("_", " ")}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {archivo.play_count} reproducciones
                  </span>
                </div>

                {isYouTube && archivo.youtube_url && (
                  <a
                    href={archivo.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mb-4 group"
                  >
                    <div className="relative overflow-hidden rounded-xl border border-white/[0.12] max-w-md">
                      <img
                        src={getYouTubeThumbnail(archivo.youtube_url) || "/placeholder-youtube.png"}
                        alt={archivo.nombre_display}
                        className="w-full aspect-video object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-red-600/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                          <Play className="w-7 h-7 text-white ml-0.5" fill="white" />
                        </div>
                      </div>
                    </div>
                  </a>
                )}

                <button
                  onClick={() => playAudio(archivo)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.05] transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400">
                    {isYouTube ? (
                      <ExternalLink className="w-5 h-5" />
                    ) : archivo.tipo === "transcripcion" ? (
                      <FileText className="w-5 h-5" />
                    ) : (
                      <Headphones className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white group-hover:text-violet-300 transition-colors">
                      {archivo.nombre_display}
                    </p>
                    {archivo.duration_seconds && (
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDuration(archivo.duration_seconds)}
                      </p>
                    )}
                  </div>
                  <Play className="w-4 h-4 text-gray-500 group-hover:text-violet-400 transition-colors" />
                </button>

                {archivo.tipo === "transcripcion" && !isYouTube && archivo.contenido_texto && (
                  <div className="mt-3">
                    <details className="group" onToggle={(e) => {
                      if ((e.target as HTMLDetailsElement).open) {
                        trackActivity({ tipo: "transcription_view", pagina: "clase", materia_slug: materiaSlug, clase_id: claseId, archivo_id: archivo.id });
                      }
                    }}>
                      <summary className="flex items-center cursor-pointer text-sm text-gray-400 hover:text-white">
                        <FileText className="w-4 h-4 mr-2" />
                        Ver transcripción completa
                      </summary>
                      <div className="mt-3 p-3 bg-black/20 rounded-lg text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {archivo.contenido_texto}
                      </div>
                    </details>
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      </main>

      {playingAudio && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-[rgba(10,10,20,0.9)] backdrop-blur-xl border-t border-white/[0.08]">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  const audio = document.querySelector("audio") as HTMLAudioElement;
                  if (audio) audio.paused ? audio.play() : audio.pause();
                }}
                className="w-10 h-10 rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center"
              >
                <Play className="w-4 h-4 text-white" fill="white" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{playingAudio.title}</p>
              </div>
              <button
                onClick={() => setPlayingAudio(null)}
                className="text-gray-400 hover:text-white text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
