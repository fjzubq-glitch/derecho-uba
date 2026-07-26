"use client";

import React, { useState, useRef, useEffect } from "react";
import { Upload, FileText, X, Check, Loader2, Headphones, Volume2, Shield } from "@/components/icons";

interface UploadItem {
  tipo: "audio_clase" | "podcast" | "transcripcion";
  nombre: string;
  archivo?: File;
  driveLink?: string;
  textoContenido?: string;
}

interface AdminUploadProps {
  materias: { id: string; nombre: string; slug: string }[];
  onSubmit: (materiaId: string, claseNumero: number, claseTitulo: string, claseFecha: string, items: UploadItem[]) => Promise<{ ok: boolean; error?: string }>;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--color-card)",
  border: "1px solid var(--color-line-soft)",
  borderRadius: 0,
  padding: "12px 14px",
  fontSize: "14px",
  color: "var(--color-text)",
  outline: "none",
  fontFamily: "var(--font-inter)",
};

const inputFocusStyle: React.CSSProperties = {
  borderColor: "var(--color-gold-dim)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-ibm-plex-mono)",
  fontSize: "10px",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--color-text-faint)",
  marginBottom: "8px",
};

const sectionHeaderStyle: React.CSSProperties = {
  fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
  fontWeight: 500,
  fontSize: "16px",
  color: "var(--color-text)",
  marginBottom: "16px",
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

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

  const [audioDropHover, setAudioDropHover] = useState(false);
  const [podcastDropHover, setPodcastDropHover] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    if (materias.length > 0 && !materiaId) {
      setMateriaId(materias[0].id);
    }
  }, [materias]);

  const handleSubmit = async () => {
    setResultMsg(null);
    if (!materiaId) {
      setResultMsg({ text: "Seleccioná una materia", isError: true });
      return;
    }
    if (!claseTitulo) {
      setResultMsg({ text: "Completá el título de la clase", isError: true });
      return;
    }
    setUploading(true);

    const items: UploadItem[] = [];

    if (useYoutube && youtubeUrl) {
      items.push({ tipo: "audio_clase", nombre: youtubeNombre || `Clase ${claseNumero}`, driveLink: youtubeUrl });
    } else if (audioFile) {
      items.push({ tipo: "audio_clase", nombre: audioNombre || `Clase ${claseNumero}`, archivo: audioFile });
    }

    if (podcastFile) {
      items.push({ tipo: "podcast", nombre: podcastNombre || `LexPodcast Ep. ${claseNumero}`, archivo: podcastFile });
    }

    if (transcripcionMethod === "drive" && transcripcionDriveLink) {
      items.push({ tipo: "transcripcion", nombre: transcripcionNombre || `Transcripción Clase ${claseNumero}`, driveLink: transcripcionDriveLink });
    } else if (transcripcionMethod === "texto" && transcripcionTexto) {
      items.push({ tipo: "transcripcion", nombre: transcripcionNombre || `Transcripción Clase ${claseNumero}`, textoContenido: transcripcionTexto });
    }

    try {
      const result = await onSubmit(materiaId, claseNumero, claseTitulo, claseFecha, items);
      if (result.ok) {
        setResultMsg({ text: "Clase subida correctamente", isError: false });
        resetForm();
      } else {
        setResultMsg({ text: result.error || "Error desconocido", isError: true });
      }
    } catch (err) {
      setResultMsg({ text: "Error al subir: " + String(err), isError: true });
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

  function Radio({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
    return (
      <label className="flex items-center gap-2" style={{ cursor: "pointer", userSelect: "none" }}>
        <div
          className="flex items-center justify-center"
          onClick={(e) => { e.preventDefault(); onChange(); }}
          style={{
            width: "14px",
            height: "14px",
            borderRadius: "50%",
            border: `1px solid ${checked ? "var(--color-gold)" : "var(--color-line)"}`,
            background: "transparent",
            cursor: "pointer",
            transition: "border-color 0.2s ease",
          }}
        >
          {checked && (
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "var(--color-gold)",
              }}
            />
          )}
        </div>
        <span style={{ fontSize: "13px", color: "var(--color-text-muted)", lineHeight: 1 }}>{label}</span>
      </label>
    );
  }

  function DropZone({ file, onFile, onClear, hover, onHover, inputRef }: {
    file: File | null;
    onFile: (f: File) => void;
    onClear: () => void;
    hover: boolean;
    onHover: (h: boolean) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
  }) {
    return (
      <div
        onClick={() => { if (!file && inputRef.current) { inputRef.current.value = ""; inputRef.current.click(); } }}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        style={{
          padding: "24px",
          textAlign: "center",
          cursor: file ? "default" : "pointer",
          border: `1px dashed ${hover ? "var(--color-gold-dim)" : "var(--color-line-soft)"}`,
          borderRadius: 0,
          transition: "border-color 0.2s ease",
        }}
      >
        {file ? (
          <div className="flex items-center justify-center gap-2">
            <Check style={{ width: "18px", height: "18px", color: "var(--color-gold)" }} />
            <span style={{ fontSize: "13px", color: "var(--color-text)" }}>{file.name}</span>
            <button onClick={(e) => { e.stopPropagation(); onClear(); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <X style={{ width: "14px", height: "14px", color: "var(--color-text-faint)" }} />
            </button>
          </div>
        ) : (
          <div>
            <Upload style={{ width: "28px", height: "28px", color: "var(--color-text-faint)", margin: "0 auto 8px", display: "block" }} />
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Arrastrá el archivo o hacé clic</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="p-6"
      style={{
        background: "var(--color-card)",
        border: "1px solid var(--color-line-soft)",
        borderRadius: 0,
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
          fontWeight: 400,
          fontSize: "22px",
          color: "var(--color-text)",
          marginBottom: "28px",
        }}
      >
        Subir Nueva Clase
      </h2>

      {/* Fila superior: Materia / Número / Fecha */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label style={labelStyle}>Materia</label>
          <select
            value={materiaId}
            onChange={(e) => setMateriaId(e.target.value)}
            style={inputStyle}
          >
            {materias.map((m) => (
              <option key={m.id} value={m.id} style={{ background: "var(--color-card)", color: "var(--color-text)" }}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Número de clase</label>
          <input
            type="number"
            value={claseNumero}
            onChange={(e) => setClaseNumero(Number(e.target.value))}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Fecha</label>
          <input
            type="date"
            value={claseFecha}
            onChange={(e) => setClaseFecha(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Título */}
      <div className="mb-6">
            <label style={labelStyle}>Título de la clase</label>

        <input
          type="text"
          value={claseTitulo}
          onChange={(e) => setClaseTitulo(e.target.value)}
          placeholder="Ej: Introducción al Derecho Contractual"
          style={{ ...inputStyle }}
        />
      </div>

      <div className="space-y-4">
        {/* Video / Audio de Clase */}
        <div style={{ padding: "24px", border: "1px solid var(--color-line-soft)", borderRadius: 0 }}>
          <h3 style={sectionHeaderStyle}>
            <Headphones style={{ width: "16px", height: "16px", color: "var(--color-gold)" }} />
            Video / Audio de Clase
          </h3>

          <div className="flex gap-4 mb-4">
            <Radio checked={!useYoutube} onChange={() => setUseYoutube(false)} label="Subir audio desde PC" />
            <Radio checked={useYoutube} onChange={() => setUseYoutube(true)} label="Link de YouTube" />
          </div>

          {useYoutube ? (
            <div className="space-y-3">
              <input
                type="text"
                value={youtubeNombre}
                onChange={(e) => setYoutubeNombre(e.target.value)}
                placeholder="Nombre del video"
                style={inputStyle}
              />
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                style={inputStyle}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={audioNombre}
                onChange={(e) => setAudioNombre(e.target.value)}
                placeholder="Nombre del audio"
                style={inputStyle}
              />
              <DropZone
                file={audioFile}
                onFile={(f) => setAudioFile(f)}
                onClear={() => setAudioFile(null)}
                hover={audioDropHover}
                onHover={setAudioDropHover}
                inputRef={audioInputRef}
              />
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  if (f) setAudioFile(f);
                }}
                style={{ display: "none" }}
              />
            </div>
          )}
        </div>

        {/* Podcast */}
        <div style={{ padding: "24px", border: "1px solid var(--color-line-soft)", borderRadius: 0 }}>
          <h3 style={sectionHeaderStyle}>
            <Volume2 style={{ width: "16px", height: "16px", color: "var(--color-gold)" }} />
            LexPodcast
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              value={podcastNombre}
              onChange={(e) => setPodcastNombre(e.target.value)}
              placeholder="Nombre del podcast"
              style={inputStyle}
            />
            <DropZone
              file={podcastFile}
              onFile={(f) => setPodcastFile(f)}
              onClear={() => setPodcastFile(null)}
              hover={podcastDropHover}
              onHover={setPodcastDropHover}
              inputRef={podcastInputRef}
            />
            <input
              ref={podcastInputRef}
              type="file"
              accept="audio/*"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                if (f) setPodcastFile(f);
              }}
              style={{ display: "none" }}
            />
          </div>
        </div>

        {/* Transcripción */}
        <div style={{ padding: "24px", border: "1px solid var(--color-line-soft)", borderRadius: 0 }}>
          <h3 style={sectionHeaderStyle}>
            <FileText style={{ width: "16px", height: "16px", color: "var(--color-gold)" }} />
            Transcripción
          </h3>

          <input
            type="text"
            value={transcripcionNombre}
            onChange={(e) => setTranscripcionNombre(e.target.value)}
            placeholder="Nombre de la transcripción"
            style={{ ...inputStyle, marginBottom: "16px" }}
          />

          <div className="flex gap-4 mb-4">
            <Radio checked={transcripcionMethod === "drive"} onChange={() => setTranscripcionMethod("drive")} label="Link de Google Drive" />
            <Radio checked={transcripcionMethod === "texto"} onChange={() => setTranscripcionMethod("texto")} label="Pegar texto" />
          </div>

          {transcripcionMethod === "drive" ? (
            <input
              type="url"
              value={transcripcionDriveLink}
              onChange={(e) => setTranscripcionDriveLink(e.target.value)}
              placeholder="https://drive.google.com/file/d/..."
              style={inputStyle}
            />
          ) : (
            <textarea
              value={transcripcionTexto}
              onChange={(e) => setTranscripcionTexto(e.target.value)}
              placeholder="Pegá el texto de la transcripción acá..."
              rows={6}
              style={{ ...inputStyle, resize: "none", lineHeight: 1.6 }}
            />
          )}
        </div>
      </div>

      {/* Resultado */}
      {resultMsg && (
        <div
          style={{
            padding: "14px 18px",
            marginBottom: "16px",
            background: resultMsg.isError ? "rgba(224, 85, 85, 0.08)" : "rgba(185, 154, 98, 0.08)",
            border: `1px solid ${resultMsg.isError ? "rgba(224, 85, 85, 0.3)" : "var(--color-gold-dim)"}`,
            borderRadius: 0,
          }}
        >
          <p
            style={{
              fontSize: "13px",
              color: resultMsg.isError ? "#E05555" : "var(--color-gold)",
              fontFamily: "var(--font-inter)",
            }}
          >
            {resultMsg.text}
          </p>
        </div>
      )}

      {/* Botón Subir */}
      <div className="flex justify-end" style={{ marginTop: resultMsg ? "8px" : "24px" }}>
        <button
          onClick={handleSubmit}
          disabled={uploading || !claseTitulo}
          style={{
            background: uploading || !claseTitulo ? "var(--color-gold-dim)" : "var(--color-gold)",
            color: "var(--color-ink)",
            border: "none",
            borderRadius: 0,
            padding: "12px 28px",
            fontSize: "13px",
            fontWeight: 600,
            fontFamily: "var(--font-inter)",
            cursor: uploading || !claseTitulo ? "not-allowed" : "pointer",
            transition: "background 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
          onMouseEnter={(e) => {
            if (!uploading && claseTitulo) e.currentTarget.style.background = "var(--color-gold-dim)";
          }}
          onMouseLeave={(e) => {
            if (!uploading && claseTitulo) e.currentTarget.style.background = "var(--color-gold)";
          }}
        >
          {uploading ? (
            <>
              <Loader2 style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} />
              Subiendo...
            </>
          ) : (
            <>
              <Upload style={{ width: "16px", height: "16px" }} />
              Subir Clase
            </>
          )}
        </button>
      </div>
    </div>
  );
}
