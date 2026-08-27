"use client";

import React, { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { formatFechaLocal } from "@/lib/utils";
import { Upload, FileText, X, Check, Loader2, Headphones, Link2, Play, Lock } from "@/components/icons";

interface UploadItem {
  tipo: "audio_clase" | "clase_youtube" | "transcripcion" | "archivo" | "enlace" | "cuestionario" | "material_privado";
  nombre: string;
  archivo?: File;
  driveLink?: string;
  cloudinaryUrl?: string;
  textoContenido?: string;
  contenido?: string;
  html?: string;
}

interface ClaseExistente {
  id: string;
  numero: number;
  titulo: string;
  fecha: string | null;
  archivos: Array<{ tipo: string }>;
}

interface AdminUploadProps {
  materias: { id: string; nombre: string; slug: string }[];
  onSubmit: (materiaId: string, claseNumero: number, claseTitulo: string, claseFecha: string, items: UploadItem[], claseId?: string) => Promise<{ ok: boolean; error?: string }>;
  claseInicial?: { claseId: string; materiaId: string } | null;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--color-card)",
  border: "1px solid var(--color-line-soft)",
  borderRadius: 0,
  padding: "12px 14px",
  fontSize: "16px",
  color: "var(--color-text)",
  outline: "none",
  fontFamily: "var(--font-inter)",
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


export default function AdminUpload({ materias, onSubmit, claseInicial }: AdminUploadProps) {
  const [modo, setModo] = useState<"nueva" | "existente">("nueva");
  const [materiaId, setMateriaId] = useState(materias[0]?.id || "");
  const [claseNumero, setClaseNumero] = useState(1);
  const [claseTitulo, setClaseTitulo] = useState("");
  const [claseFecha, setClaseFecha] = useState("");
  const [clasesExistentes, setClasesExistentes] = useState<ClaseExistente[]>([]);
  const [claseSeleccionada, setClaseSeleccionada] = useState("");
  const [cargandoClases, setCargandoClases] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [transcripcionMethod, setTranscripcionMethod] = useState<"drive" | "texto">("drive");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const [transcripcionDriveLink, setTranscripcionDriveLink] = useState("");
  const [transcripcionTexto, setTranscripcionTexto] = useState("");

  const [archivoNombre, setArchivoNombre] = useState("");
  const [archivoFile, setArchivoFile] = useState<File | null>(null);
  const [archivoLink, setArchivoLink] = useState("");
  const [archivoUseLink, setArchivoUseLink] = useState(false);
  const archivoInputRef = useRef<HTMLInputElement>(null);
  const [archivoDropHover, setArchivoDropHover] = useState(false);

  const [cuestionarioNombre, setCuestionarioNombre] = useState("");
  const [cuestionarioContenido, setCuestionarioContenido] = useState("");
  const [cuestionarioError, setCuestionarioError] = useState("");
  const [cuestionarioModo, setCuestionarioModo] = useState<"json" | "html">("json");
  const jsonUploadInputRef = useRef<HTMLInputElement>(null);
  const htmlUploadInputRef = useRef<HTMLInputElement>(null);

  const [enlaceNombre, setEnlaceNombre] = useState("");
  const [enlaceUrl, setEnlaceUrl] = useState("");

  const [materialPrivadoNombre, setMaterialPrivadoNombre] = useState("");
  const [materialPrivadoFile, setMaterialPrivadoFile] = useState<File | null>(null);
  const [materialPrivadoLink, setMaterialPrivadoLink] = useState("");
  const [materialPrivadoUseLink, setMaterialPrivadoUseLink] = useState(false);
  const materialPrivadoInputRef = useRef<HTMLInputElement>(null);
  const [materialPrivadoDropHover, setMaterialPrivadoDropHover] = useState(false);

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeNombre, setYoutubeNombre] = useState("");
  const [useYoutube, setUseYoutube] = useState(false);

  const [claseYoutubeItems, setClaseYoutubeItems] = useState<Array<{ nombre: string; url: string }>>([{ nombre: "", url: "" }]);

  const [cloudinaryUrl, setCloudinaryUrl] = useState("");
  const [useCloudinary, setUseCloudinary] = useState(false);

  const [audioDropHover, setAudioDropHover] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});

  const hasAudio = audioFile !== null || (useYoutube && youtubeUrl.trim() !== "") || (useCloudinary && cloudinaryUrl.trim() !== "");
  const hasTranscripcion =
    (transcripcionMethod === "drive" && transcripcionDriveLink.trim() !== "") ||
    (transcripcionMethod === "texto" && transcripcionTexto.trim() !== "");
  const hasArchivo = archivoFile !== null || (archivoUseLink && archivoLink.trim() !== "");
  const hasCuestionario = cuestionarioContenido.trim() !== "";
  const hasEnlace = enlaceUrl.trim() !== "";
  const hasClaseYoutube = claseYoutubeItems.some((i) => i.url.trim() !== "");
  const hasMaterialPrivado = materialPrivadoFile !== null || (materialPrivadoUseLink && materialPrivadoLink.trim() !== "");

  const loadedCount = [hasAudio, hasTranscripcion, hasArchivo, hasEnlace, hasClaseYoutube, hasCuestionario, hasMaterialPrivado].filter(Boolean).length;
  useEffect(() => {
    if (materias.length > 0 && !materiaId) {
      setMateriaId(materias[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materias]);

  useEffect(() => {
    if (modo === "existente" && materiaId) {
      cargarClasesExistentes(materiaId, claseInicial?.claseId);
    }
  }, [modo, materiaId, claseInicial]);

  useEffect(() => {
    if (claseInicial?.claseId) {
      setModo("existente");
      setMateriaId(claseInicial.materiaId);
    }
  }, [claseInicial]);

  async function cargarClasesExistentes(materiaIdSel: string, preseleccionarId?: string) {
    setCargandoClases(true);
    setClaseSeleccionada(preseleccionarId || "");
    const { data } = await supabase
      .from("clases")
      .select("id, numero, titulo, fecha")
      .eq("materia_id", materiaIdSel)
      .order("numero");

    const clases: ClaseExistente[] = (data || []).map((c: { id: string; numero: number; titulo: string; fecha: string | null }) => ({ ...c, archivos: [] }));

    const claseIds = clases.map((c) => c.id);
    const archivosMap: Record<string, Array<{ tipo: string }>> = {};
    if (claseIds.length > 0) {
      const { data: todosArchivos } = await supabase
        .from("archivos")
        .select("tipo, clase_id")
        .in("clase_id", claseIds);

      if (todosArchivos) {
        for (const a of todosArchivos) {
          const cid = a.clase_id as string;
          if (!archivosMap[cid]) archivosMap[cid] = [];
          archivosMap[cid].push({ tipo: a.tipo });
        }
      }
    }

    const clasesConArchivos = clases.map((c) => ({
      ...c,
      archivos: archivosMap[c.id] || [],
    }));

    setClasesExistentes(clasesConArchivos);
    setCargandoClases(false);
  }

  function onSeleccionarClase(claseId: string) {
    setClaseSeleccionada(claseId);
    const clase = clasesExistentes.find((c) => c.id === claseId);
    if (clase) {
      setClaseNumero(clase.numero);
      setClaseTitulo(clase.titulo);
      setClaseFecha(clase.fecha || "");
    }
  }

  const handleSubmit = async () => {
    setResultMsg(null);

    const nuevosErrores: Record<string, string> = {};
    if (!materiaId) nuevosErrores.materia = "Seleccioná una materia";
    if (modo === "existente" && !claseSeleccionada) nuevosErrores.clase = "Seleccioná una clase existente";
    if (modo === "nueva" && !claseTitulo.trim()) nuevosErrores.titulo = "El título de la clase es obligatorio";

    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      const IDS: Record<string, string> = { titulo: "admin-clase-titulo", clase: "admin-clase-existente" };
      const primerCampo = ["titulo", "materia", "clase"].find((k) => nuevosErrores[k]);
      if (primerCampo) {
        const el = document.getElementById(IDS[primerCampo]) || document.getElementById("admin-materia-nueva") || document.getElementById("admin-materia-existente");
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.focus({ preventScroll: true });
      }
      return;
    }

    setErrores({});
    setUploading(true);

    if (hasCuestionario) {
      if (cuestionarioModo === "json") {
        try {
          const d = JSON.parse(cuestionarioContenido);
          if (!d || !Array.isArray(d.questions) || d.questions.length === 0) {
            throw new Error("El contenido debe tener questions[] con al menos una pregunta");
          }
        } catch (err) {
          setUploading(false);
          setResultMsg({ text: "Cuestionario: JSON inválido — " + (err as Error).message, isError: true });
          return;
        }
      } else if (!/^\s*<!doctype\s+html/i.test(cuestionarioContenido) && !/^\s*<html/i.test(cuestionarioContenido)) {
        setUploading(false);
        setResultMsg({ text: "Cuestionario: el contenido no parece HTML válido", isError: true });
        return;
      }
    }

    const items: UploadItem[] = [];

    if (useCloudinary && cloudinaryUrl) {
      items.push({ tipo: "audio_clase", nombre: `Clase ${claseNumero}`, cloudinaryUrl: cloudinaryUrl });
    } else if (useYoutube && youtubeUrl) {
      items.push({ tipo: "audio_clase", nombre: youtubeNombre || `Clase ${claseNumero}`, driveLink: youtubeUrl });
    } else if (audioFile) {
      items.push({ tipo: "audio_clase", nombre: `Clase ${claseNumero}`, archivo: audioFile });
    }

    if (transcripcionMethod === "drive" && transcripcionDriveLink) {
      items.push({ tipo: "transcripcion", nombre: `Clase ${claseNumero}`, driveLink: transcripcionDriveLink });
    } else if (transcripcionMethod === "texto" && transcripcionTexto) {
      items.push({ tipo: "transcripcion", nombre: `Clase ${claseNumero}`, textoContenido: transcripcionTexto });
    }

    if (hasArchivo) {
      if (archivoUseLink && archivoLink) {
        items.push({ tipo: "archivo", nombre: archivoNombre || `Material Clase ${claseNumero}`, driveLink: archivoLink });
      } else if (archivoFile) {
        items.push({ tipo: "archivo", nombre: archivoNombre || `Material Clase ${claseNumero}`, archivo: archivoFile });
      }
    }

    if (hasCuestionario) {
      if (cuestionarioModo === "html") {
        items.push({ tipo: "cuestionario", nombre: cuestionarioNombre || `Cuestionario Clase ${claseNumero}`, html: cuestionarioContenido });
      } else {
        items.push({ tipo: "cuestionario", nombre: cuestionarioNombre || `Cuestionario Clase ${claseNumero}`, contenido: cuestionarioContenido });
      }
    }

    if (hasEnlace) {
      items.push({ tipo: "enlace", nombre: enlaceNombre || `Enlace útil`, driveLink: enlaceUrl });
    }

    if (hasMaterialPrivado) {
      if (materialPrivadoUseLink && materialPrivadoLink) {
        items.push({ tipo: "material_privado", nombre: materialPrivadoNombre || `Material privado`, driveLink: materialPrivadoLink });
      } else if (materialPrivadoFile) {
        items.push({ tipo: "material_privado", nombre: materialPrivadoNombre || `Material privado`, archivo: materialPrivadoFile });
      }
    }

    claseYoutubeItems.forEach((item, idx) => {
      if (item.url.trim()) {
        items.push({ tipo: "clase_youtube", nombre: item.nombre.trim() || `Clase Virtual ${claseYoutubeItems.filter((i) => i.url.trim()).length > 1 ? idx + 1 : ""}`.trim(), driveLink: item.url.trim() });
      }
    });

    if (items.length === 0) {
      setResultMsg({ text: "Cargá al menos un archivo", isError: true });
      setUploading(false);
      return;
    }

    try {
      const result = await onSubmit(materiaId, claseNumero, claseTitulo, claseFecha, items, modo === "existente" ? claseSeleccionada : undefined);
      if (result.ok) {
        setResultMsg({ text: modo === "existente" ? "Contenido agregado correctamente" : "Clase subida correctamente", isError: false });
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
    setClaseSeleccionada("");
    setAudioFile(null);
    setTranscripcionDriveLink("");
    setTranscripcionTexto("");
    setYoutubeUrl("");
    setYoutubeNombre("");
    setUseYoutube(false);
    setCloudinaryUrl("");
    setUseCloudinary(false);
    setArchivoNombre("");
    setArchivoFile(null);
    setArchivoLink("");
    setArchivoUseLink(false);
    setCuestionarioNombre("");
    setCuestionarioContenido("");
    setCuestionarioError("");
    setCuestionarioModo("json");
    setEnlaceNombre("");
    setEnlaceUrl("");
    setMaterialPrivadoNombre("");
    setMaterialPrivadoFile(null);
    setMaterialPrivadoLink("");
    setMaterialPrivadoUseLink(false);
    setClaseYoutubeItems([{ nombre: "", url: "" }]);
  };

  function Radio({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
    return (
      <label
        className="flex items-center gap-2 radio-tap"
        onClick={(e) => { e.preventDefault(); onChange(); }}
        style={{ cursor: "pointer", userSelect: "none" }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: "14px",
            height: "14px",
            borderRadius: "50%",
            border: `1px solid ${checked ? "var(--color-gold)" : "var(--color-line)"}`,
            background: "transparent",
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

  function DropZone({ file, onClear, hover, onHover, inputRef }: {
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
          marginBottom: "20px",
        }}
      >
        Subir Contenido
      </h2>

      {/* Selector de modo */}
      <div className="flex flex-wrap gap-4 mb-8">
        <Radio checked={modo === "nueva"} onChange={() => setModo("nueva")} label="Clase nueva" />
        <Radio checked={modo === "existente"} onChange={() => setModo("existente")} label="Agregar a clase existente" />
      </div>

      {/* ═══ BLOQUE 1 · DATOS DE LA CLASE ═══ */}
      <div className="mb-8">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            paddingBottom: "12px",
            marginBottom: "24px",
            borderBottom: "1px solid var(--color-line-soft)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-ibm-plex-mono)",
              fontSize: "10px",
              letterSpacing: "0.14em",
              color: "var(--color-gold)",
            }}
          >
            01
          </span>
          <h3 style={{ ...sectionHeaderStyle, marginBottom: 0 }}>
            {modo === "existente" ? "Seleccionar clase" : "Datos de la clase"}
          </h3>
        </div>

        {modo === "existente" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label htmlFor="admin-materia-existente" style={labelStyle}>Materia</label>
              <select
                id="admin-materia-existente"
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
              <label htmlFor="admin-clase-existente" style={labelStyle}>Clase</label>
              <select
                id="admin-clase-existente"
                value={claseSeleccionada}
                onChange={(e) => {
                  onSeleccionarClase(e.target.value);
                  if (errores.clase) setErrores((prev) => ({ ...prev, clase: "" }));
                }}
                style={{ ...inputStyle, borderColor: errores.clase ? "#E05555" : "var(--color-line-soft)" }}
              >
                <option value="">{cargandoClases ? "Cargando..." : "Seleccioná una clase..."}</option>
                {clasesExistentes.map((c) => (
                  <option key={c.id} value={c.id} style={{ background: "var(--color-card)", color: "var(--color-text)" }}>
                    {String(c.numero).padStart(2, "0")} — {c.titulo}
                    {c.fecha ? ` — ${formatFechaLocal(c.fecha, { day: "numeric", month: "short", year: "numeric" })}` : ""}
                  </option>
                ))}
              </select>
              {errores.clase && (
                <p style={{ marginTop: "6px", fontSize: "11px", fontFamily: "var(--font-inter)", color: "#E05555" }}>
                  {errores.clase}
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
        {/* Fila superior: Materia / Número / Fecha */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label htmlFor="admin-materia-nueva" style={labelStyle}>Materia</label>
          <select
            id="admin-materia-nueva"
            value={materiaId}
            onChange={(e) => {
              setMateriaId(e.target.value);
              if (errores.materia) setErrores((prev) => ({ ...prev, materia: "" }));
            }}
            style={{ ...inputStyle, borderColor: errores.materia ? "#E05555" : "var(--color-line-soft)" }}
          >
            {materias.map((m) => (
              <option key={m.id} value={m.id} style={{ background: "var(--color-card)", color: "var(--color-text)" }}>
                {m.nombre}
              </option>
            ))}
          </select>
          {errores.materia && (
            <p style={{ marginTop: "6px", fontSize: "11px", fontFamily: "var(--font-inter)", color: "#E05555" }}>
              {errores.materia}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="admin-clase-numero" style={labelStyle}>Número de clase</label>
          <input
            id="admin-clase-numero"
            type="number"
            value={claseNumero}
            onChange={(e) => setClaseNumero(Number(e.target.value))}
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="admin-clase-fecha" style={labelStyle}>Fecha</label>
          <input
            id="admin-clase-fecha"
            type="date"
            value={claseFecha}
            onChange={(e) => setClaseFecha(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Título */}
      <div className="mb-6">
            <label htmlFor="admin-clase-titulo" style={labelStyle}>Título de la clase <span style={{ color: "var(--color-gold)" }}>*</span></label>

        <input
          id="admin-clase-titulo"
          type="text"
          value={claseTitulo}
          onChange={(e) => {
            setClaseTitulo(e.target.value);
            if (errores.titulo) setErrores((prev) => ({ ...prev, titulo: "" }));
          }}
          placeholder="Ej: Introducción al Derecho Contractual"
          aria-invalid={!!errores.titulo}
          style={{
            ...inputStyle,
            borderColor: errores.titulo ? "#E05555" : "var(--color-line-soft)",
          }}
        />
        {errores.titulo && (
          <p
            style={{
              marginTop: "6px",
              fontSize: "11px",
              fontFamily: "var(--font-inter)",
              color: "#E05555",
            }}
          >
            {errores.titulo}
          </p>
        )}
      </div>
          </>
        )}
      </div>

      {/* Info de archivos existentes */}
      {modo === "existente" && claseSeleccionada && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
            padding: "16px 20px",
            marginBottom: "24px",
            background: "var(--color-ink)",
            border: "1px solid var(--color-line-soft)",
            borderRadius: 0,
          }}
        >
          <div className="flex flex-wrap items-center gap-4">
            {["audio_clase", "clase_youtube", "transcripcion", "archivo"].map((tipo) => {
              const exist = (clasesExistentes.find((c) => c.id === claseSeleccionada)?.archivos || []).some((a) => a.tipo === tipo);
              const label = tipo === "audio_clase" ? "Audio" : tipo === "clase_youtube" ? "Clase Virtual" : tipo === "transcripcion" ? "Transcripción" : "Archivo";
              return (
                <div key={tipo} className="flex items-center gap-2">
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      border: `1px solid ${exist ? "var(--color-gold)" : "var(--color-line)"}`,
                      background: exist ? "var(--color-gold)" : "transparent",
                    }}
                  >
                    {exist && <Check style={{ width: "10px", height: "10px", color: "var(--color-ink)" }} />}
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--font-ibm-plex-mono)",
                      fontSize: "10px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: exist ? "var(--color-text)" : "var(--color-text-faint)",
                    }}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
          <span
            style={{
              fontFamily: "var(--font-ibm-plex-mono)",
              fontSize: "11px",
              color: "var(--color-text-muted)",
            }}
          >
            Agregá solo el contenido que falta
          </span>
        </div>
      )}

      {/* ═══ BLOQUE 2 · CONTENIDO A SUBIR ═══ */}
      <div className="mb-8">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            paddingBottom: "12px",
            marginBottom: "24px",
            borderBottom: "1px solid var(--color-line-soft)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-ibm-plex-mono)",
              fontSize: "10px",
              letterSpacing: "0.14em",
              color: "var(--color-gold)",
            }}
          >
            02
          </span>
          <h3 style={{ ...sectionHeaderStyle, marginBottom: 0 }}>
            Contenido a subir
          </h3>
        </div>

        <div className="space-y-4">
        {/* Video / Audio de Clase */}
        <div style={{ padding: "24px", border: "1px solid var(--color-line-soft)", borderRadius: 0 }}>
          <h3 style={sectionHeaderStyle}>
            <Headphones style={{ width: "16px", height: "16px", color: "var(--color-gold)" }} />
            Video / Audio de Clase
          </h3>

          <div className="flex flex-wrap gap-4 mb-4">
            <Radio checked={!useYoutube && !useCloudinary} onChange={() => { setUseYoutube(false); setUseCloudinary(false); }} label="Subir audio desde PC" />
            <Radio checked={useYoutube} onChange={() => { setUseYoutube(true); setUseCloudinary(false); }} label="Link de YouTube" />
            <Radio checked={useCloudinary} onChange={() => { setUseCloudinary(true); setUseYoutube(false); }} label="Link de Cloudinary" />
          </div>

          {useCloudinary ? (
            <div className="space-y-3">
              <input
                type="url"
                value={cloudinaryUrl}
                onChange={(e) => setCloudinaryUrl(e.target.value)}
                placeholder="https://res.cloudinary.com/.../video/audio.mp3"
                aria-label="URL de Cloudinary"
                style={inputStyle}
              />
            </div>
          ) : useYoutube ? (
            <div className="space-y-3">
              <input
                type="text"
                value={youtubeNombre}
                onChange={(e) => setYoutubeNombre(e.target.value)}
                placeholder="Nombre del video"
                aria-label="Nombre del video"
                style={inputStyle}
              />
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                aria-label="URL de YouTube"
                style={inputStyle}
              />
            </div>
          ) : (
            <div className="space-y-3">
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

        {/* Clase Virtual */}
        <div style={{ padding: "24px", border: "1px solid var(--color-line-soft)", borderRadius: 0 }}>
          <h3 style={sectionHeaderStyle}>
            <Play style={{ width: "16px", height: "16px", color: "var(--color-gold)" }} />
Clase Virtual
          </h3>

          <div className="space-y-3">
            <p style={{ fontSize: "12px", color: "var(--color-text-faint)", fontFamily: "var(--font-ibm-plex-mono)" }}>
              Podés agregar uno o más videos de YouTube de la misma clase. Cada uno aparecerá como card separada.
            </p>
            {claseYoutubeItems.map((item, idx) => (
              <div key={idx} className="space-y-3" style={{ padding: "16px", border: "1px solid var(--color-line-soft)", borderRadius: 0 }}>
                <div className="flex items-start justify-between gap-2">
                  <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "11px", color: "var(--color-text-muted)" }}>
                    Video {idx + 1}
                  </span>
                  {claseYoutubeItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setClaseYoutubeItems((prev) => prev.filter((_, i) => i !== idx))}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      aria-label={`Quitar video ${idx + 1}`}
                    >
                      <X style={{ width: "14px", height: "14px", color: "var(--color-text-faint)" }} />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={item.nombre}
                  onChange={(e) => setClaseYoutubeItems((prev) => prev.map((it, i) => (i === idx ? { ...it, nombre: e.target.value } : it)))}
                  placeholder={`Nombre del video ${idx + 1} (ej: Clase completa, Parte 1...)`}
                  aria-label={`Nombre del video ${idx + 1}`}
                  style={{ ...inputStyle, marginBottom: "8px" }}
                />
                <input
                  type="url"
                  value={item.url}
                  onChange={(e) => setClaseYoutubeItems((prev) => prev.map((it, i) => (i === idx ? { ...it, url: e.target.value } : it)))}
                  placeholder="https://youtube.com/watch?v=..."
                  aria-label={`URL de YouTube del video ${idx + 1}`}
                  style={inputStyle}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setClaseYoutubeItems((prev) => [...prev, { nombre: "", url: "" }])}
              style={{
                background: "none",
                border: "1px solid var(--color-line)",
                color: "var(--color-gold)",
                padding: "10px 16px",
                cursor: "pointer",
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "11px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              + Agregar otro video
            </button>
          </div>
        </div>

        {/* Transcripción */}
        <div style={{ padding: "24px", border: "1px solid var(--color-line-soft)", borderRadius: 0 }}>
          <h3 style={sectionHeaderStyle}>
            <FileText style={{ width: "16px", height: "16px", color: "var(--color-gold)" }} />
            Transcripción
          </h3>

          <div className="flex flex-wrap gap-4 mb-4">
            <Radio checked={transcripcionMethod === "drive"} onChange={() => setTranscripcionMethod("drive")} label="Link de Google Drive" />
            <Radio checked={transcripcionMethod === "texto"} onChange={() => setTranscripcionMethod("texto")} label="Pegar texto" />
          </div>

          {transcripcionMethod === "drive" ? (
            <input
              type="url"
              value={transcripcionDriveLink}
              onChange={(e) => setTranscripcionDriveLink(e.target.value)}
              placeholder="https://drive.google.com/file/d/..."
              aria-label="Link de Google Drive"
              style={inputStyle}
            />
          ) : (
            <textarea
              value={transcripcionTexto}
              onChange={(e) => setTranscripcionTexto(e.target.value)}
              placeholder="Pegá el texto de la transcripción acá..."
              aria-label="Texto de la transcripción"
              rows={6}
              style={{ ...inputStyle, resize: "none", lineHeight: 1.6 }}
            />
          )}
        </div>

        {/* Archivo adjunto */}
        <div style={{ padding: "24px", border: "1px solid var(--color-line-soft)", borderRadius: 0 }}>
          <h3 style={sectionHeaderStyle}>
            <FileText style={{ width: "16px", height: "16px", color: "var(--color-gold)" }} />
            Archivo adjunto
          </h3>

          <input
            type="text"
            value={archivoNombre}
            onChange={(e) => setArchivoNombre(e.target.value)}
            placeholder="Nombre del material (PDF, programa, etc.)"
            aria-label="Nombre del material"
            style={{ ...inputStyle, marginBottom: "16px" }}
          />

          <div className="flex flex-wrap gap-4 mb-4">
            <Radio checked={!archivoUseLink} onChange={() => setArchivoUseLink(false)} label="Subir archivo desde PC" />
            <Radio checked={archivoUseLink} onChange={() => setArchivoUseLink(true)} label="Link externo" />
          </div>

          {archivoUseLink ? (
            <input
              type="url"
              value={archivoLink}
              onChange={(e) => setArchivoLink(e.target.value)}
              placeholder="https://drive.google.com/file/d/..."
              aria-label="Link externo del archivo"
              style={inputStyle}
            />
          ) : (
            <div className="space-y-3">
              <DropZone
                file={archivoFile}
                onFile={(f) => setArchivoFile(f)}
                onClear={() => setArchivoFile(null)}
                hover={archivoDropHover}
                onHover={setArchivoDropHover}
                inputRef={archivoInputRef}
              />
              <input
                ref={archivoInputRef}
                type="file"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  if (f) setArchivoFile(f);
                }}
                style={{ display: "none" }}
              />
            </div>
          )}
        </div>

        {/* Cuestionario interactivo (solo admin) */}
        <div style={{ padding: "24px", border: "1px dashed var(--color-gold-dim)", borderRadius: 0 }}>
          <h3 style={sectionHeaderStyle}>
            <Check style={{ width: "16px", height: "16px", color: "var(--color-gold)" }} />
            Cuestionario interactivo
          </h3>

          <input
            type="text"
            value={cuestionarioNombre}
            onChange={(e) => setCuestionarioNombre(e.target.value)}
            placeholder="Nombre del cuestionario (ej: Cuestionario Clase 5)"
            aria-label="Nombre del cuestionario"
            style={{ ...inputStyle, marginBottom: "16px" }}
          />

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCuestionarioModo("json")}
                style={{
                  background: cuestionarioModo === "json" ? "var(--color-gold)" : "none",
                  border: "1px solid var(--color-line)",
                  color: cuestionarioModo === "json" ? "var(--color-ink)" : "var(--color-gold)",
                  padding: "9px 14px",
                  cursor: "pointer",
                  fontFamily: "var(--font-ibm-plex-mono)",
                  fontSize: "11px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                PEGAR JSON
              </button>
              <button
                type="button"
                onClick={() => setCuestionarioModo("html")}
                style={{
                  background: cuestionarioModo === "html" ? "var(--color-gold)" : "none",
                  border: "1px solid var(--color-line)",
                  color: cuestionarioModo === "html" ? "var(--color-ink)" : "var(--color-gold)",
                  padding: "9px 14px",
                  cursor: "pointer",
                  fontFamily: "var(--font-ibm-plex-mono)",
                  fontSize: "11px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                SUBIR HTML DIRECTO
              </button>
            </div>

            {cuestionarioModo === "html" && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => htmlUploadInputRef.current?.click()}
                  style={{ background: "none", border: "1px solid var(--color-line)", color: "var(--color-gold)", padding: "9px 14px", cursor: "pointer", fontFamily: "var(--font-ibm-plex-mono)", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase" }}
                >
                  Elegir archivo .html
                </button>
                {cuestionarioContenido && (
                  <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "11px", color: "var(--color-text-muted)" }}>
                    {cuestionarioContenido.length.toLocaleString()} caracteres listos
                  </span>
                )}
              </div>
            )}
            <input
              ref={htmlUploadInputRef}
              type="file"
              accept=".html,.htm,text/html"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const text = ev.target?.result;
                    if (typeof text === "string") {
                      setCuestionarioContenido(text);
                      setCuestionarioError("");
                    }
                  };
                  reader.readAsText(file);
                }
                e.target.value = "";
              }}
            />
            <input
              ref={jsonUploadInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const text = ev.target?.result;
                    if (typeof text === "string") {
                      setCuestionarioContenido(text);
                      setCuestionarioError("");
                      try {
                        const d = JSON.parse(text);
                        if (!d.questions || !Array.isArray(d.questions)) {
                          setCuestionarioError("El archivo no tiene questions[] válido");
                        }
                      } catch {
                        setCuestionarioError("El archivo no es JSON válido");
                      }
                    }
                  };
                  reader.readAsText(file);
                }
                e.target.value = "";
              }}
            />
            <textarea
              value={cuestionarioContenido}
              onChange={(e) => setCuestionarioContenido(e.target.value)}
              placeholder={cuestionarioModo === "html" ? 'Subí un archivo .html o pegá el HTML completo del cuestionario (fiel al original). El visor lo muestra tal cual.' : 'Pegá el contenido del cuestionario en formato JSON: { "header": {...}, "questions": [...], "material": [...] }'}
              aria-label="Contenido del cuestionario"
              rows={10}
              spellCheck={false}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "var(--font-ibm-plex-mono)", fontSize: "12px", lineHeight: 1.5 }}
            />
            {cuestionarioError && (
              <p style={{ fontSize: "11px", color: "#E05555", fontFamily: "var(--font-inter)" }}>{cuestionarioError}</p>
            )}
            <p style={{ fontSize: "11px", color: "var(--color-text-faint)", fontFamily: "var(--font-ibm-plex-mono)" }}>
              {cuestionarioModo === "html"
                ? "Solo visible para el administrador. El HTML se sube tal cual, sin regenerar ni cambiar su estructura. Editalo luego en &ldquo;Gestionar contenido&rdquo;."
                : "Solo visible para el administrador. El HTML se genera automáticamente desde este contenido JSON."}
            </p>
          </div>
        </div>

        {/* Enlace útil */}
        <div style={{ padding: "24px", border: "1px solid var(--color-line-soft)", borderRadius: 0 }}>
          <h3 style={sectionHeaderStyle}>
            <Link2 style={{ width: "16px", height: "16px", color: "var(--color-gold)" }} />
            Enlace útil
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              value={enlaceNombre}
              onChange={(e) => setEnlaceNombre(e.target.value)}
              placeholder="Nombre del enlace (ej: Fallo CSJN, Ley X, material)"
              aria-label="Nombre del enlace"
              style={inputStyle}
            />
            <input
              type="url"
              value={enlaceUrl}
              onChange={(e) => setEnlaceUrl(e.target.value)}
              placeholder="https://..."
              aria-label="URL del enlace"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Material privado (solo admin) */}
        <div style={{ padding: "24px", border: "1px dashed var(--color-gold-dim)", borderRadius: 0 }}>
          <h3 style={sectionHeaderStyle}>
            <Lock style={{ width: "16px", height: "16px", color: "var(--color-gold)" }} />
            Material privado
          </h3>

          <input
            type="text"
            value={materialPrivadoNombre}
            onChange={(e) => setMaterialPrivadoNombre(e.target.value)}
            placeholder="Nombre del material (infografía, archivo especial, etc.)"
            aria-label="Nombre del material privado"
            style={{ ...inputStyle, marginBottom: "16px" }}
          />

          <div className="flex flex-wrap gap-4 mb-4">
            <Radio checked={!materialPrivadoUseLink} onChange={() => setMaterialPrivadoUseLink(false)} label="Subir archivo desde PC" />
            <Radio checked={materialPrivadoUseLink} onChange={() => setMaterialPrivadoUseLink(true)} label="Link externo" />
          </div>

          {materialPrivadoUseLink ? (
            <input
              type="url"
              value={materialPrivadoLink}
              onChange={(e) => setMaterialPrivadoLink(e.target.value)}
              placeholder="https://drive.google.com/file/d/..."
              aria-label="Link externo del material privado"
              style={inputStyle}
            />
          ) : (
            <div className="space-y-3">
              <DropZone
                file={materialPrivadoFile}
                onFile={(f) => setMaterialPrivadoFile(f)}
                onClear={() => setMaterialPrivadoFile(null)}
                hover={materialPrivadoDropHover}
                onHover={setMaterialPrivadoDropHover}
                inputRef={materialPrivadoInputRef}
              />
              <input
                ref={materialPrivadoInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.webp,.jfif,.svg,.pdf,.doc,.docx,.txt,.ppt,.pptx"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  if (f) setMaterialPrivadoFile(f);
                }}
                style={{ display: "none" }}
              />
            </div>
          )}
          <p style={{ fontSize: "11px", color: "var(--color-text-faint)", fontFamily: "var(--font-ibm-plex-mono)", marginTop: "8px" }}>
            Solo visible para el administrador. Ideal para infografías, archivos especiales, etc.
          </p>
        </div>

        </div>
      </div>

      {/* ═══ INDICADOR DE COMPLETITUD ═══ */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          padding: "16px 20px",
          marginBottom: "24px",
          background: "var(--color-ink)",
          border: "1px solid var(--color-line-soft)",
          borderRadius: 0,
        }}
      >
        <div className="flex flex-wrap items-center gap-4">
          {[
            { label: "Audio", ready: hasAudio },
            { label: "Clase Virtual", ready: hasClaseYoutube },
            { label: "Transcripción", ready: hasTranscripcion },
            { label: "Archivo adjunto", ready: hasArchivo },
            { label: "Enlace", ready: hasEnlace },
            { label: "Cuestionario", ready: hasCuestionario },
            { label: "Material privado", ready: hasMaterialPrivado },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className="flex items-center justify-center"
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  border: `1px solid ${item.ready ? "var(--color-gold)" : "var(--color-line)"}`,
                  background: item.ready ? "var(--color-gold)" : "transparent",
                  transition: "all 0.25s ease",
                }}
              >
                {item.ready && <Check style={{ width: "10px", height: "10px", color: "var(--color-ink)" }} />}
              </div>
              <span
                style={{
                  fontFamily: "var(--font-ibm-plex-mono)",
                  fontSize: "10px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: item.ready ? "var(--color-text)" : "var(--color-text-faint)",
                  transition: "color 0.25s ease",
                }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
        <span
          style={{
            fontFamily: "var(--font-ibm-plex-mono)",
            fontSize: "12px",
            color: loadedCount === 7 ? "var(--color-gold)" : "var(--color-text-muted)",
          }}
        >
          {loadedCount}/7 cargados
        </span>
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
          disabled={uploading}
          style={{
            background: uploading ? "var(--color-gold-dim)" : "var(--color-gold)",
            color: "var(--color-ink)",
            border: "none",
            borderRadius: 0,
            padding: "14px 28px",
            fontSize: "14px",
            fontWeight: 600,
            fontFamily: "var(--font-inter)",
            cursor: uploading ? "not-allowed" : "pointer",
            transition: "background 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
          onMouseEnter={(e) => {
            if (!uploading) e.currentTarget.style.background = "var(--color-gold-dim)";
          }}
          onMouseLeave={(e) => {
            if (!uploading) e.currentTarget.style.background = "var(--color-gold)";
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
              {modo === "existente" ? "Agregar contenido" : "Subir Clase"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
