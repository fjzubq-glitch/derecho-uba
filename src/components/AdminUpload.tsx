"use client";

import React, { useState, useRef } from "react";
import { Upload, FileText, X, Check, Loader2 } from "@/components/icons";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";

interface UploadItem {
  tipo: "audio_clase" | "podcast" | "transcripcion";
  nombre: string;
  archivo?: File;
  driveLink?: string;
  textoContenido?: string;
}

interface AdminUploadProps {
  materias: { id: string; nombre: string; slug: string }[];
  onSubmit: (materiaId: string, claseNumero: number, claseTitulo: string, claseFecha: string, items: UploadItem[]) => Promise<void>;
}

export default function AdminUpload({ materias, onSubmit }: AdminUploadProps) {
  const [materiaId, setMateriaId] = useState(materias[0]?.id || "");
  const [claseNumero, setClaseNumero] = useState(1);
  const [claseTitulo, setClaseTitulo] = useState("");
  const [claseFecha, setClaseFecha] = useState("");
  const [uploading, setUploading] = useState(false);
  const [transcripcionMethod, setTranscripcionMethod] = useState<"drive" | "texto">("drive");

  const [audioNombre, setAudioNombre] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const [podcastNombre, setPodcastNombre] = useState("");
  const [podcastFile, setPodcastFile] = useState<File | null>(null);
  const podcastInputRef = useRef<HTMLInputElement>(null);

  const [transcripcionNombre, setTranscripcionNombre] = useState("");
  const [transcripcionDriveLink, setTranscripcionDriveLink] = useState("");
  const [transcripcionTexto, setTranscripcionTexto] = useState("");

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeNombre, setYoutubeNombre] = useState("");
  const [useYoutube, setUseYoutube] = useState(false);

  const handleSubmit = async () => {
    if (!materiaId || !claseTitulo) return;
    setUploading(true);

    const items: UploadItem[] = [];

    if (useYoutube && youtubeUrl) {
      items.push({
        tipo: "audio_clase",
        nombre: youtubeNombre || `Clase ${claseNumero}`,
        driveLink: youtubeUrl,
      });
    } else if (audioFile) {
      items.push({
        tipo: "audio_clase",
        nombre: audioNombre || `Clase ${claseNumero}`,
        archivo: audioFile,
      });
    }

    if (podcastFile) {
      items.push({
        tipo: "podcast",
        nombre: podcastNombre || `LexPodcast Ep. ${claseNumero}`,
        archivo: podcastFile,
      });
    }

    if (transcripcionMethod === "drive" && transcripcionDriveLink) {
      items.push({
        tipo: "transcripcion",
        nombre: transcripcionNombre || `Transcripción Clase ${claseNumero}`,
        driveLink: transcripcionDriveLink,
      });
    } else if (transcripcionMethod === "texto" && transcripcionTexto) {
      items.push({
        tipo: "transcripcion",
        nombre: transcripcionNombre || `Transcripción Clase ${claseNumero}`,
        textoContenido: transcripcionTexto,
      });
    }

    try {
      await onSubmit(materiaId, claseNumero, claseTitulo, claseFecha, items);
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setClaseTitulo("");
    setClaseFecha("");
    setAudioNombre("");
    setAudioFile(null);
    setPodcastNombre("");
    setPodcastFile(null);
    setTranscripcionNombre("");
    setTranscripcionDriveLink("");
    setTranscripcionTexto("");
    setYoutubeUrl("");
    setYoutubeNombre("");
    setUseYoutube(false);
  };

  return (
    <GlassCard className="p-6">
      <h2 className="text-xl font-semibold text-white mb-6">Subir Nueva Clase</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Materia</label>
          <select
            value={materiaId}
            onChange={(e) => setMateriaId(e.target.value)}
            className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50"
          >
            {materias.map((m) => (
              <option key={m.id} value={m.id} className="bg-[#1a1a2e]">
                {m.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Número de Clase</label>
          <input
            type="number"
            value={claseNumero}
            onChange={(e) => setClaseNumero(Number(e.target.value))}
            className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Fecha</label>
          <input
            type="date"
            value={claseFecha}
            onChange={(e) => setClaseFecha(e.target.value)}
            className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50"
          />
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-1">Título de la Clase</label>
        <input
          type="text"
          value={claseTitulo}
          onChange={(e) => setClaseTitulo(e.target.value)}
          placeholder="Ej: Introducción al Derecho Contractual"
          className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
        />
      </div>

      <div className="space-y-4">
        <div className="border border-white/[0.08] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-sm font-medium text-white">🎥 Video / Audio de Clase</h3>
          </div>

          <div className="flex gap-4 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!useYoutube}
                onChange={() => setUseYoutube(false)}
                className="accent-violet-500"
              />
              <span className="text-sm text-gray-300">Subir audio desde PC</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={useYoutube}
                onChange={() => setUseYoutube(true)}
                className="accent-violet-500"
              />
              <span className="text-sm text-gray-300">Link de YouTube</span>
            </label>
          </div>

          {useYoutube ? (
            <div className="space-y-3">
              <input
                type="text"
                value={youtubeNombre}
                onChange={(e) => setYoutubeNombre(e.target.value)}
                placeholder="Nombre del video"
                className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
              />
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={audioNombre}
                onChange={(e) => setAudioNombre(e.target.value)}
                placeholder="Nombre del audio"
                className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
              />
              <div
                onClick={() => audioInputRef.current?.click()}
                className="border-2 border-dashed border-white/[0.15] rounded-xl p-6 text-center cursor-pointer hover:border-violet-500/40 transition-colors"
              >
                {audioFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-sm text-white">{audioFile.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setAudioFile(null); }}
                      className="ml-2"
                    >
                      <X className="w-4 h-4 text-gray-400 hover:text-white" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Arrastrá el archivo o hacé clic</p>
                  </div>
                )}
              </div>
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </div>
          )}
        </div>

        <div className="border border-white/[0.08] rounded-xl p-4">
          <h3 className="text-sm font-medium text-white mb-3">🎙️ LexPodcast</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={podcastNombre}
              onChange={(e) => setPodcastNombre(e.target.value)}
              placeholder="Nombre del podcast"
              className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
            />
            <div
              onClick={() => podcastInputRef.current?.click()}
              className="border-2 border-dashed border-white/[0.15] rounded-xl p-6 text-center cursor-pointer hover:border-violet-500/40 transition-colors"
            >
              {podcastFile ? (
                <div className="flex items-center justify-center gap-2">
                  <Check className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-white">{podcastFile.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setPodcastFile(null); }}
                    className="ml-2"
                  >
                    <X className="w-4 h-4 text-gray-400 hover:text-white" />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Arrastrá el archivo o hacé clic</p>
                </div>
              )}
            </div>
            <input
              ref={podcastInputRef}
              type="file"
              accept="audio/*"
              onChange={(e) => setPodcastFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </div>
        </div>

        <div className="border border-white/[0.08] rounded-xl p-4">
          <h3 className="text-sm font-medium text-white mb-3">📄 Transcripción</h3>
          <input
            type="text"
            value={transcripcionNombre}
            onChange={(e) => setTranscripcionNombre(e.target.value)}
            placeholder="Nombre de la transcripción"
            className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 mb-3"
          />

          <div className="flex gap-4 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={transcripcionMethod === "drive"}
                onChange={() => setTranscripcionMethod("drive")}
                className="accent-violet-500"
              />
              <span className="text-sm text-gray-300">Link de Google Drive</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={transcripcionMethod === "texto"}
                onChange={() => setTranscripcionMethod("texto")}
                className="accent-violet-500"
              />
              <span className="text-sm text-gray-300">Pegar texto</span>
            </label>
          </div>

          {transcripcionMethod === "drive" ? (
            <input
              type="url"
              value={transcripcionDriveLink}
              onChange={(e) => setTranscripcionDriveLink(e.target.value)}
              placeholder="https://drive.google.com/file/d/..."
              className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
            />
          ) : (
            <textarea
              value={transcripcionTexto}
              onChange={(e) => setTranscripcionTexto(e.target.value)}
              placeholder="Pegá el texto de la transcripción acá..."
              rows={6}
              className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 resize-none"
            />
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSubmit} disabled={uploading || !claseTitulo}>
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Subiendo...
            </>
          ) : (
            "Subir Clase"
          )}
        </Button>
      </div>
    </GlassCard>
  );
}
