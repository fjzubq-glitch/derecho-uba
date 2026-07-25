"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { trackActivity } from "@/lib/tracking";
import GlassCard from "@/components/ui/GlassCard";
import { ArrowLeft, Calendar, Headphones, FileText, Play, ExternalLink } from "@/components/icons";
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

interface Clase {
  id: string;
  numero: number;
  titulo: string;
  fecha: string;
  archivos: Archivo[];
}

const TIPO_ICONS: Record<string, React.ReactNode> = {
  audio_clase: <Headphones className="w-4 h-4" />,
  podcast: <Play className="w-4 h-4" />,
  transcripcion: <FileText className="w-4 h-4" />,
  youtube: <ExternalLink className="w-4 h-4" />,
};

const TIPO_COLORS: Record<string, string> = {
  audio_clase: "text-violet-400 bg-violet-500/20",
  podcast: "text-cyan-400 bg-cyan-500/20",
  transcripcion: "text-amber-400 bg-amber-500/20",
  youtube: "text-red-400 bg-red-500/20",
};

export default function MateriaPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.materia as string;

  const [materia, setMateria] = useState<{ id: string; nombre: string } | null>(null);
  const [clases, setClases] = useState<Clase[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingAudio, setPlayingAudio] = useState<{ src: string; title: string } | null>(null);

  useEffect(() => {
    loadData();
    trackActivity({ tipo: "page_view", pagina: "materia", materia_slug: slug });
  }, [slug]);

  async function loadData() {
    const { data: materiaData } = await supabase
      .from("materias")
      .select("id, nombre")
      .eq("slug", slug)
      .single();

    if (materiaData) {
      setMateria(materiaData);

      const { data: clasesData } = await supabase
        .from("clases")
        .select("id, numero, titulo, fecha")
        .eq("materia_id", materiaData.id)
        .order("numero");

      if (clasesData) {
        const clasesWithFiles = await Promise.all(
          clasesData.map(async (c) => {
            const { data: archivos } = await supabase
              .from("archivos")
              .select("*")
              .eq("clase_id", c.id)
              .order("created_at");

            return { ...c, archivos: archivos || [] };
          })
        );
        setClases(clasesWithFiles);
      }
    }
    setLoading(false);
  }

  async function playAudio(archivo: Archivo) {
    if (archivo.youtube_url) {
      window.open(archivo.youtube_url, "_blank");
      trackActivity({ tipo: "youtube_open", pagina: "materia", materia_slug: slug, archivo_id: archivo.id });
      return;
    }

    const res = await fetch(`/api/stream/${archivo.id}`);
    const data = await res.json();

    if (data.url) {
      setPlayingAudio({ src: data.url, title: archivo.nombre_display });

      await supabase.rpc("increment_play_count", { file_id: archivo.id });
      trackActivity({ tipo: "play_start", pagina: "materia", materia_slug: slug, archivo_id: archivo.id });
    }
  }

  return (
    <div className="min-h-screen pb-32">
      <header className="border-b border-white/[0.08] bg-[rgba(10,10,20,0.8)] backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">
              {materia?.nombre || "Cargando..."}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : clases.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <p className="text-gray-400">No hay clases cargadas todavía</p>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {clases.map((clase) => (
              <GlassCard key={clase.id} className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="text-xs text-violet-400 font-medium">
                      CLASE {clase.numero.toString().padStart(2, "0")}
                    </span>
                    <h3 className="text-lg font-semibold text-white mt-1">
                      {clase.titulo}
                    </h3>
                  </div>
                  {clase.fecha && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(clase.fecha).toLocaleDateString("es-AR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {clase.archivos.map((archivo) => {
                    const isYouTube = archivo.tipo === "youtube" || archivo.youtube_url;
                    const thumbnail = isYouTube
                      ? getYouTubeThumbnail(archivo.youtube_url || "")
                      : null;

                    return (
                      <div key={archivo.id}>
                        {isYouTube && thumbnail && (
                          <a
                            href={archivo.youtube_url || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block mb-3 group"
                          >
                            <div className="relative overflow-hidden rounded-xl border border-white/[0.12] max-w-md">
                              <img
                                src={thumbnail}
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
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.05] transition-colors text-left group"
                        >
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${TIPO_COLORS[archivo.tipo]}`}
                          >
                            {TIPO_ICONS[archivo.tipo]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate group-hover:text-violet-300 transition-colors">
                              {archivo.nombre_display}
                            </p>
                            <div className="flex items-center gap-3 mt-0.5">
                              {archivo.duration_seconds && (
                                <span className="text-xs text-gray-500">
                                  {formatDuration(archivo.duration_seconds)}
                                </span>
                              )}
                              <span className="text-xs text-gray-600">
                                {archivo.play_count} reproducciones
                              </span>
                            </div>
                          </div>
                          {isYouTube ? (
                            <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-red-400 transition-colors" />
                          ) : (
                            <Play className="w-4 h-4 text-gray-500 group-hover:text-violet-400 transition-colors" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            ))}
          </div>
        )}
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
