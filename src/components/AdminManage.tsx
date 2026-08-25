"use client";

import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { formatFechaLocal } from "@/lib/utils";
import { useEscapeKey } from "@/lib/useEscapeKey";
import { Calendar, Headphones, FileText, Play, ExternalLink, Loader2, X, Check, Upload, MoreVertical, Link2, ChevronUp, ChevronDown } from "@/components/icons";
import CuestionarioEditor from "@/components/CuestionarioEditor";
import type { CuestionarioData } from "@/lib/cuestionario";

interface Archivo {
  id: string;
  tipo: string;
  nombre_display: string;
  storage_key: string | null;
  youtube_url: string | null;
  cloudinary_url: string | null;
  play_count: number;
  nota: string | null;
  orden: number;
  contenido?: CuestionarioData | null;
}

interface Materia {
  id: string;
  nombre: string;
  slug: string;
  estado: string;
}

interface Clase {
  id: string;
  numero: number;
  titulo: string;
  tema: string | null;
  fecha: string | null;
  materia_id: string;
  materia_nombre: string;
  materia_slug: string;
  archivos: Archivo[];
}

interface EditData {
  tipo: "clase" | "archivo" | "punteo_clase" | "cuestionario";
  id: string;
  data: Record<string, string | number>;
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-ibm-plex-mono)",
  fontSize: "10px",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--color-text-faint)",
  marginBottom: "8px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--color-ink)",
  border: "1px solid var(--color-line-soft)",
  borderRadius: 0,
  padding: "12px 14px",
  fontSize: "16px",
  color: "var(--color-text)",
  outline: "none",
  fontFamily: "var(--font-inter)",
};

export default function AdminManage({ onEditarClase }: { onEditarClase?: (claseId: string, materiaId: string) => void }) {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [clases, setClases] = useState<Clase[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditData | null>(null);
  const [deleting, setDeleting] = useState<{ tipo: string; id: string; nombre: string } | null>(null);
  const [replacing, setReplacing] = useState<{ archivoId: string; nombre: string; tipo: string } | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newDriveLink, setNewDriveLink] = useState("");
  const [newYoutubeUrl, setNewYoutubeUrl] = useState("");
  const [newCloudinaryUrl, setNewCloudinaryUrl] = useState("");
  const [newNombre, setNewNombre] = useState("");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [filtroMateria, setFiltroMateria] = useState("todas");
  const [editandoCuestionario, setEditandoCuestionario] = useState<{ archivoId: string; nombre: string; contenido: CuestionarioData } | null>(null);
  const [cuestionarioSaving, setCuestionarioSaving] = useState(false);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const [jsonTargetArchivoId, setJsonTargetArchivoId] = useState<string | null>(null);

  const cerrarReplace = () => {
    setReplacing(null);
    setNewFile(null);
    setNewDriveLink("");
    setNewYoutubeUrl("");
    setNewCloudinaryUrl("");
  };

  useEscapeKey(!!editing, () => setEditing(null));
  useEscapeKey(!!deleting, () => setDeleting(null));
  useEscapeKey(!!replacing, cerrarReplace);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadClases();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("[data-kebab]")) return;
      setOpenMenu(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function loadClases() {
    setLoading(true);

    const { data: materiasData } = await supabase
      .from("materias")
      .select("*")
      .order("nombre");

    if (materiasData) {
      setMaterias(materiasData.map((m) => ({
        id: m.id,
        nombre: m.nombre,
        slug: m.slug,
        estado: m.estado || "en_curso",
      })));
    }

    const { data: clasesData } = await supabase
      .from("clases")
      .select(`
        id,
        numero,
        titulo,
        fecha,
        materias!inner(id, nombre, slug)
      `)
      .order("numero");

    if (clasesData) {
      const clasesWithFiles = await Promise.all(
        (clasesData as unknown as Array<{
          id: string;
          numero: number;
          titulo: string;
          tema: string | null;
          fecha: string | null;
          materias?: { id: string; nombre: string; slug: string } | null;
        }>).map(async (c) => {
          const { data: archivos } = await supabase
            .from("archivos")
            .select("*")
            .eq("clase_id", c.id)
            .order("orden")
            .order("created_at");

          return {
            id: c.id,
            numero: c.numero,
            titulo: c.titulo,
            tema: c.tema,
            fecha: c.fecha,
            materia_id: c.materias?.id || "",
            materia_nombre: c.materias?.nombre || "",
            materia_slug: c.materias?.slug || "",
            archivos: archivos || [],
          };
        })
      );
      setClases(clasesWithFiles);
    }

    setLoading(false);
  }

  async function toggleEstado(slug: string, currentEstado: string) {
    const nuevoEstado = currentEstado === "finalizada" ? "en_curso" : "finalizada";
    try {
      const res = await fetch("/api/admin/materias", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, estado: nuevoEstado }),
      });
      const data = await res.json();
      if (data.ok) {
        setMaterias((prev) =>
          prev.map((m) => (m.slug === slug ? { ...m, estado: nuevoEstado } : m))
        );
        setMessage(`Estado cambiado a "${nuevoEstado === "finalizada" ? "Finalizada" : "En curso"}"`);
      } else {
        setMessage("Error: " + data.error);
      }
    } catch (err) {
      setMessage("Error: " + String(err));
    }
  }

  async function handleEdit() {
    if (!editing) return;
    setProcessing(true);

    try {
      const res = await fetch("/api/admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });

      const data = await res.json();
      if (data.ok) {
        setMessage("Guardado correctamente");
        setEditing(null);
        loadClases();
      } else {
        setMessage("Error: " + data.error);
      }
    } catch (err) {
      setMessage("Error: " + String(err));
    } finally {
      setProcessing(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setProcessing(true);

    try {
      const res = await fetch(`/api/admin?tipo=${deleting.tipo}&id=${deleting.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (data.ok) {
        setMessage("Eliminado correctamente");
        setDeleting(null);
        loadClases();
      } else {
        setMessage("Error: " + data.error);
      }
    } catch (err) {
      setMessage("Error: " + String(err));
    } finally {
      setProcessing(false);
    }
  }

  async function handleReplace() {
    if (!replacing) return;
    setProcessing(true);

    try {
      if (replacing.tipo === "audio_clase") {
        if (newCloudinaryUrl) {
          const res = await fetch("/api/admin", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tipo: "archivo_link",
              id: replacing.archivoId,
              data: { cloudinary_url: newCloudinaryUrl, nombre_display: newNombre || replacing.nombre },
            }),
          });

          const data = await res.json();
          if (!data.ok) {
            setMessage("Error: " + data.error);
            setProcessing(false);
            return;
          }
        } else if (newFile) {
          const formData = new FormData();
          formData.append("archivoId", replacing.archivoId);
          formData.append("file", newFile);

          const res = await fetch("/api/admin", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();
          if (!data.ok) {
            setMessage("Error: " + data.error);
            setProcessing(false);
            return;
          }
        } else {
          setMessage("Error: subí un archivo o pegá un link de Cloudinary");
          setProcessing(false);
          return;
        }
      } else if (replacing.tipo === "archivo" || replacing.tipo === "punteo_clase" || replacing.tipo === "cuestionario") {
        if (newFile) {
          const formData = new FormData();
          formData.append("archivoId", replacing.archivoId);
          formData.append("file", newFile);
          const res = await fetch("/api/admin", { method: "POST", body: formData });
          const data = await res.json();
          if (!data.ok) {
            setMessage("Error: " + data.error);
            setProcessing(false);
            return;
          }
        } else if (newDriveLink) {
          const res = await fetch("/api/admin", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tipo: "archivo_link",
              id: replacing.archivoId,
              data: { youtube_url: newDriveLink, nombre_display: newNombre || replacing.nombre },
            }),
          });
          const data = await res.json();
          if (!data.ok) {
            setMessage("Error: " + data.error);
            setProcessing(false);
            return;
          }
        } else {
          setMessage("Error: seleccioná un archivo o pegá un link");
          setProcessing(false);
          return;
        }
      } else if (replacing.tipo === "enlace") {
        if (!newDriveLink) {
          setMessage("Error: pegá un enlace");
          setProcessing(false);
          return;
        }
        const res = await fetch("/api/admin", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo: "archivo_link",
            id: replacing.archivoId,
            data: { youtube_url: newDriveLink, nombre_display: newNombre || replacing.nombre },
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          setMessage("Error: " + data.error);
          setProcessing(false);
          return;
        }
      } else if (replacing.tipo === "transcripcion") {
        if (!newDriveLink && !newNombre) {
          setMessage("Error: pegá un link de Drive o escribí un nombre");
          setProcessing(false);
          return;
        }
        const res = await fetch("/api/admin", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo: "archivo_link",
            id: replacing.archivoId,
            data: { youtube_url: newDriveLink, nombre_display: newNombre || replacing.nombre },
          }),
        });

        const data = await res.json();
        if (!data.ok) {
          setMessage("Error: " + data.error);
          setProcessing(false);
          return;
        }
      } else if (replacing.tipo === "youtube" || replacing.tipo === "clase_youtube") {
        if (!newYoutubeUrl) {
          setMessage("Error: pegá un link de YouTube");
          setProcessing(false);
          return;
        }
        const res = await fetch("/api/admin", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo: "archivo_link",
            id: replacing.archivoId,
            data: { youtube_url: newYoutubeUrl, nombre_display: newNombre || replacing.nombre },
          }),
        });

        const data = await res.json();
        if (!data.ok) {
          setMessage("Error: " + data.error);
          setProcessing(false);
          return;
        }
      }

      setMessage("Reemplazado correctamente");
      setReplacing(null);
      setNewFile(null);
      setNewDriveLink("");
      setNewYoutubeUrl("");
      setNewCloudinaryUrl("");
      setNewNombre("");
      loadClases();
    } catch (err) {
      setMessage("Error: " + String(err));
    } finally {
      setProcessing(false);
    }
  }

  async function handleGuardarCuestionario(contenido: CuestionarioData) {
    if (!editandoCuestionario) return;
    setCuestionarioSaving(true);
    try {
      const res = await fetch(`/api/admin/cuestionario/${editandoCuestionario.archivoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenido }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage("Cuestionario guardado correctamente");
        setEditandoCuestionario(null);
        loadClases();
      } else {
        setMessage("Error: " + data.error);
      }
    } catch (err) {
      setMessage("Error: " + String(err));
    } finally {
      setCuestionarioSaving(false);
    }
  }

  async function abrirEditorCuestionario(archivo: Archivo) {
    setMessage("");
    let contenido = archivo.contenido;
    if (!contenido || !Array.isArray(contenido.questions)) {
      const { data } = await supabase.from("archivos").select("contenido").eq("id", archivo.id).single();
      contenido = data?.contenido;
    }
    if (!contenido || !Array.isArray(contenido.questions)) {
      setMessage("Error: este cuestionario no tiene contenido editable (se subió como HTML). Reemplazalo por uno creado con contenido JSON.");
      return;
    }
    setEditandoCuestionario({ archivoId: archivo.id, nombre: archivo.nombre_display, contenido });
  }

  async function handleAdjuntarJson(file: File) {
    if (!jsonTargetArchivoId) return;
    try {
      const text = await file.text();
      const contenido = JSON.parse(text) as CuestionarioData;
      if (!contenido.header || !Array.isArray(contenido.questions)) {
        setMessage("Error: el archivo no tiene el formato correcto (falta header o questions).");
        return;
      }
      const archivo = clases.flatMap((c) => c.archivos).find((a) => a.id === jsonTargetArchivoId);
      setEditandoCuestionario({
        archivoId: jsonTargetArchivoId,
        nombre: archivo?.nombre_display || file.name,
        contenido,
      });
    } catch {
      setMessage("Error: no se pudo leer el archivo JSON. Asegurate de que sea un JSON válido.");
    }
    setJsonTargetArchivoId(null);
  }

  async function handleReorder(archivos: Archivo[], index: number, direction: "up" | "down") {
    const archivoActual = archivos[index];
    const indexDestino = direction === "up" ? index - 1 : index + 1;
    if (indexDestino < 0 || indexDestino >= archivos.length) return;

    const archivoDestino = archivos[indexDestino];

    const newItems = [
      { id: archivoActual.id, orden: archivoDestino.orden },
      { id: archivoDestino.id, orden: archivoActual.orden },
    ];

    try {
      const res = await fetch("/api/admin/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: newItems }),
      });
      const data = await res.json();
      if (!data.ok) {
        setMessage("Error al reordenar");
        return;
      }
      loadClases();
    } catch {
      setMessage("Error al reordenar");
    }
  }

  const TIPO_ICONS: Record<string, React.ReactNode> = {
    audio_clase: <Headphones style={{ width: "14px", height: "14px" }} />,
    clase_youtube: <Play style={{ width: "14px", height: "14px" }} />,
    transcripcion: <FileText style={{ width: "14px", height: "14px" }} />,
    punteo_clase: <FileText style={{ width: "14px", height: "14px" }} />,
    archivo: <FileText style={{ width: "14px", height: "14px" }} />,
    cuestionario: <Check style={{ width: "14px", height: "14px" }} />,
    enlace: <Link2 style={{ width: "14px", height: "14px" }} />,
    youtube: <ExternalLink style={{ width: "14px", height: "14px" }} />,
  };

  const TIPO_LABELS: Record<string, string> = {
    audio_clase: "Audio de clase",
    clase_youtube: "Clase Virtual",
    transcripcion: "Transcripción",
    punteo_clase: "Punteo de clase",
    archivo: "Archivo adjunto",
    cuestionario: "Cuestionario interactivo",
    enlace: "Enlace útil",
    youtube: "YouTube",
  };

  const canReplace = (tipo: string) => tipo === "audio_clase" || tipo === "clase_youtube" || tipo === "transcripcion" || tipo === "youtube" || tipo === "enlace" || tipo === "archivo" || tipo === "punteo_clase" || tipo === "cuestionario";

  const actionBtnStyle: React.CSSProperties = {
    padding: "6px 12px",
    fontSize: "11px",
    fontWeight: 500,
    fontFamily: "var(--font-inter)",
    background: "transparent",
    border: "1px solid var(--color-line)",
    borderRadius: 0,
    color: "var(--color-text-muted)",
    cursor: "pointer",
    transition: "border-color 0.2s ease, color 0.2s ease",
  };

  function KebabMenu({ menuKey, items }: {
    menuKey: string;
    items: Array<{ label: string; danger?: boolean; onClick: () => void }>;
  }) {
    const isOpen = openMenu === menuKey;
    return (
      <div className="relative" data-kebab>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpenMenu(isOpen ? null : menuKey);
          }}
          aria-label="Acciones"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-faint)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "30px",
            height: "30px",
            borderRadius: 0,
            padding: 0,
            transition: "color 0.2s ease, background 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--color-gold)";
            e.currentTarget.style.background = "var(--color-line-soft)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--color-text-faint)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <MoreVertical style={{ width: "16px", height: "16px" }} />
        </button>
        {isOpen && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "36px",
              minWidth: "150px",
              background: "var(--color-card)",
              border: "1px solid var(--color-line)",
              borderRadius: 0,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
              zIndex: 20,
              padding: "4px",
            }}
          >
            {items.map((item) => (
              <button
                key={item.label}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenu(null);
                  item.onClick();
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "9px 12px",
                  fontSize: "12px",
                  fontFamily: "var(--font-inter)",
                  background: "none",
                  border: "none",
                  borderRadius: 0,
                  cursor: "pointer",
                  color: item.danger ? "#E05555" : "var(--color-text)",
                  transition: "background 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-line-soft)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const modalBackdrop: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 50,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(5, 7, 12, 0.7)",
    padding: "16px",
  };

  const modalCard: React.CSSProperties = {
    width: "100%",
    maxWidth: "440px",
    background: "var(--color-card)",
    border: "1px solid var(--color-line-soft)",
    borderRadius: 0,
    padding: "28px",
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          style={{
            padding: "14px 18px",
            background: message.startsWith("Error") ? "rgba(224, 85, 85, 0.08)" : "rgba(185, 154, 98, 0.08)",
            border: `1px solid ${message.startsWith("Error") ? "rgba(224, 85, 85, 0.3)" : "var(--color-gold-dim)"}`,
            borderRadius: 0,
          }}
        >
          <p
            style={{
              fontSize: "13px",
              color: message.startsWith("Error") ? "#E05555" : "var(--color-gold)",
              fontFamily: "var(--font-inter)",
            }}
          >
            {message}
          </p>
        </div>
      )}

      {materias.length > 0 && (
        <div
          style={{
            background: "var(--color-card)",
            border: "1px solid var(--color-line-soft)",
            borderRadius: 0,
            padding: "20px 22px",
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <h3
              style={{
                fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                fontWeight: 500,
                fontSize: "16px",
                color: "var(--color-text)",
              }}
            >
              Estado de materias
            </h3>
          </div>
          <div className="space-y-2">
            {materias.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-4"
                style={{
                  padding: "10px 14px",
                  background: "var(--color-ink)",
                  border: "1px solid var(--color-line-soft)",
                  borderRadius: 0,
                }}
              >
                <div className="min-w-0">
                  <p
                    style={{
                      fontSize: "14px",
                      color: "var(--color-text)",
                      fontFamily: "var(--font-inter)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {m.nombre}
                  </p>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "var(--color-text-faint)",
                      fontFamily: "var(--font-ibm-plex-mono)",
                      marginTop: "2px",
                    }}
                  >
                    {m.slug}
                  </p>
                </div>
                <button
                  onClick={() => toggleEstado(m.slug, m.estado)}
                  style={{
                    flexShrink: 0,
                    padding: "6px 14px",
                    fontSize: "11px",
                    fontFamily: "var(--font-ibm-plex-mono)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    background: m.estado === "finalizada" ? "var(--color-gold)" : "transparent",
                    color: m.estado === "finalizada" ? "var(--color-ink)" : "var(--color-text-muted)",
                    border: `1px solid ${m.estado === "finalizada" ? "var(--color-gold)" : "var(--color-line)"}`,
                    borderRadius: 0,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (m.estado !== "finalizada") {
                      e.currentTarget.style.borderColor = "var(--color-gold-dim)";
                      e.currentTarget.style.color = "var(--color-text)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (m.estado !== "finalizada") {
                      e.currentTarget.style.borderColor = "var(--color-line)";
                      e.currentTarget.style.color = "var(--color-text-muted)";
                    }
                  }}
                >
                  {m.estado === "finalizada" ? "Finalizada" : "En curso"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="skeleton" style={{ height: "220px" }} />
      ) : clases.length === 0 ? (
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            background: "var(--color-card)",
            border: "1px solid var(--color-line-soft)",
            borderRadius: 0,
          }}
        >
          <p style={{ fontSize: "14px", color: "var(--color-text-faint)" }}>No hay clases cargadas</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Selector de materia a gestionar */}
          <div
            className="flex items-center justify-between flex-wrap gap-3"
            style={{
              background: "var(--color-card)",
              border: "1px solid var(--color-line-soft)",
              borderRadius: 0,
              padding: "18px 22px",
            }}
          >
            <div>
              <p
                style={{
                  fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                  fontWeight: 500,
                  fontSize: "16px",
                  color: "var(--color-text)",
                }}
              >
                Gestionar materia
              </p>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--color-text-muted)",
                  marginTop: "2px",
                }}
              >
                Elegí qué materia querés editar
              </p>
            </div>
            <select
              value={filtroMateria}
              onChange={(e) => setFiltroMateria(e.target.value)}
              aria-label="Seleccionar materia para gestionar"
              style={{
                background: "var(--color-ink)",
                border: "1px solid var(--color-line)",
                color: "var(--color-text)",
                padding: "10px 40px 10px 14px",
                fontSize: "13px",
                fontFamily: "var(--font-inter)",
                outline: "none",
                borderRadius: 0,
                cursor: "pointer",
                width: "min(220px, 100%)",
              }}
            >
              <option value="todas">Todas las materias</option>
              {materias.map((m) => (
                <option key={m.id} value={m.slug}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>

          {clases.filter((c) => filtroMateria === "todas" || c.materia_slug === filtroMateria).length === 0 ? (
            <div
              style={{
                padding: "40px 24px",
                textAlign: "center",
                background: "var(--color-card)",
                border: "1px solid var(--color-line-soft)",
                borderRadius: 0,
              }}
            >
              <p style={{ fontSize: "14px", color: "var(--color-text-muted)", lineHeight: 1.7 }}>
                Esta materia todavía no tiene clases.
                <br />
                <span style={{ color: "var(--color-text-faint)", fontSize: "12px" }}>
                  Subilas desde la pestaña &ldquo;Subir contenido&rdquo;.
                </span>
              </p>
            </div>
          ) : (
            clases
            .filter((c) => filtroMateria === "todas" || c.materia_slug === filtroMateria)
            .map((clase) => (
            <div
              key={clase.id}
              style={{
                background: "var(--color-card)",
                border: "1px solid var(--color-line-soft)",
                borderRadius: 0,
                padding: "28px",
              }}
            >
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      style={{
                        fontFamily: "var(--font-ibm-plex-mono)",
                        fontSize: "10px",
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "var(--color-gold)",
                      }}
                    >
                      {clase.materia_nombre}
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--color-text-faint)" }}>•</span>
                    <span
                      style={{
                        fontFamily: "var(--font-ibm-plex-mono)",
                        fontSize: "10px",
                        letterSpacing: "0.14em",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      CLASE {clase.numero.toString().padStart(2, "0")}
                    </span>
                  </div>
                  <h3
                    style={{
                      fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                      fontWeight: 500,
                      fontSize: "20px",
                      lineHeight: 1.3,
                      color: "var(--color-text)",
                    }}
                  >
                    {clase.titulo}
                  </h3>
                  {clase.fecha && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <Calendar style={{ width: "13px", height: "13px", color: "var(--color-text-faint)" }} />
                      <span style={{ fontSize: "12px", color: "var(--color-text-faint)" }}>
                        {formatFechaLocal(clase.fecha, { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  )}
                </div>
                <KebabMenu
                  menuKey={`clase-${clase.id}`}
                  items={[
                    {
                      label: "Agregar contenido",
                      onClick: () => { if (onEditarClase) onEditarClase(clase.id, clase.materia_id); },
                    },
                    {
                      label: "Editar clase",
                      onClick: () => setEditing({
                        tipo: "clase",
                        id: clase.id,
                        data: { titulo: clase.titulo, tema: clase.tema || "", fecha: clase.fecha || "", numero: clase.numero }
                      }),
                    },
                    {
                      label: "Borrar clase",
                      danger: true,
                      onClick: () => setDeleting({ tipo: "clase", id: clase.id, nombre: clase.titulo }),
                    },
                  ]}
                />
              </div>

              {clase.archivos.length > 0 ? (
                <div className="space-y-2">
                  {clase.archivos.filter((a) => a.tipo !== "podcast").map((archivo, idx) => (
                    <div
                      key={archivo.id}
                      className="flex items-center gap-3"
                      style={{
                        marginLeft: "16px",
                        padding: "10px 8px 10px 16px",
                        borderLeft: "2px solid var(--color-line-soft)",
                      }}
                    >
                      <div
                        className="flex items-center justify-center"
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          border: "1px solid var(--color-gold-dim)",
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ color: "var(--color-gold)" }}>{TIPO_ICONS[archivo.tipo] || TIPO_ICONS.transcripcion}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          style={{
                            fontSize: "13px",
                            fontWeight: 500,
                            color: "var(--color-text)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {archivo.nombre_display || TIPO_LABELS[archivo.tipo] || archivo.tipo.replace("_", " ")}
                        </p>
                        <p style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                          {archivo.play_count} reproducciones
                        </p>
                        {archivo.nota && (
                          <p style={{ fontSize: "11px", color: "var(--color-gold)", fontStyle: "italic", marginTop: "2px" }}>
                            {archivo.nota}
                          </p>
                        )}
                      </div>
                      {(archivo.tipo === "archivo" || archivo.tipo === "punteo_clase") && (
                        <div className="flex flex-col" style={{ gap: "2px" }}>
                          <button
                            onClick={() => handleReorder(clase.archivos, idx, "up")}
                            disabled={idx === 0}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: idx === 0 ? "default" : "pointer",
                              padding: "2px",
                              color: idx === 0 ? "var(--color-line-soft)" : "var(--color-gold)",
                              opacity: idx === 0 ? 0.4 : 1,
                              transition: "color 0.2s ease",
                            }}
                            title="Mover arriba"
                          >
                            <ChevronUp style={{ width: "14px", height: "14px" }} />
                          </button>
                          <button
                            onClick={() => handleReorder(clase.archivos, idx, "down")}
                            disabled={idx === clase.archivos.length - 1}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: idx === clase.archivos.length - 1 ? "default" : "pointer",
                              padding: "2px",
                              color: idx === clase.archivos.length - 1 ? "var(--color-line-soft)" : "var(--color-gold)",
                              opacity: idx === clase.archivos.length - 1 ? 0.4 : 1,
                              transition: "color 0.2s ease",
                            }}
                            title="Mover abajo"
                          >
                            <ChevronDown style={{ width: "14px", height: "14px" }} />
                          </button>
                        </div>
                      )}
                      <KebabMenu
                        menuKey={`archivo-${archivo.id}`}
                        items={[
                          ...(canReplace(archivo.tipo)
                            ? [{
                                label: "Reemplazar",
                                onClick: () => {
                                  setReplacing({ archivoId: archivo.id, nombre: archivo.nombre_display, tipo: archivo.tipo });
                                  setNewFile(null);
                                  setNewDriveLink("");
                                  setNewYoutubeUrl("");
                                  setNewCloudinaryUrl("");
                                  setNewNombre(archivo.nombre_display);
                                },
                              }]
                            : []),
                          {
                            label: "Editar",
                            onClick: () => {
                              if (archivo.tipo === "cuestionario") {
                                abrirEditorCuestionario(archivo);
                              } else {
                                setEditing({
                                  tipo: archivo.tipo as EditData["tipo"],
                                  id: archivo.id,
                                  data: { nombre_display: archivo.nombre_display, nota: archivo.nota || "" }
                                });
                              }
                            },
                          },
                          ...(archivo.tipo === "cuestionario"
                            ? [{
                                label: "Adjuntar JSON",
                                onClick: () => {
                                  setJsonTargetArchivoId(archivo.id);
                                  setTimeout(() => jsonFileInputRef.current?.click(), 0);
                                },
                              }]
                            : []),
                          {
                            label: "Borrar",
                            danger: true,
                            onClick: () => setDeleting({ tipo: archivo.tipo, id: archivo.id, nombre: archivo.nombre_display }),
                          },
                        ]}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p
                  style={{
                    marginLeft: "16px",
                    paddingLeft: "16px",
                    borderLeft: "2px solid var(--color-line-soft)",
                    fontSize: "12px",
                    color: "var(--color-text-faint)",
                    fontFamily: "var(--font-ibm-plex-mono)",
                    fontStyle: "italic",
                  }}
                >
                  Sin archivos cargados
                </p>
              )}
            </div>
          )))}
        </div>
      )}

      {/* Cuestionario Content Editor Modal */}
      {editandoCuestionario && (
        <div style={{ ...modalBackdrop, alignItems: "flex-start" }} onClick={(e) => { if (e.target === e.currentTarget && !cuestionarioSaving) setEditandoCuestionario(null); }}>
          <div style={{ ...modalCard, maxWidth: "720px", maxHeight: "92vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif", fontWeight: 500, fontSize: "18px", color: "var(--color-text)" }}>
                  Editar cuestionario
                </h3>
                <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "2px" }}>{editandoCuestionario.nombre}</p>
              </div>
              <button onClick={() => setEditandoCuestionario(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)" }}>
                <X style={{ width: "18px", height: "18px" }} />
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <CuestionarioEditor
                contenido={editandoCuestionario.contenido}
                onSave={handleGuardarCuestionario}
                onCancel={() => setEditandoCuestionario(null)}
                saving={cuestionarioSaving}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div style={modalBackdrop} onClick={(e) => { if (e.target === e.currentTarget) setEditing(null); }}>
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3
                style={{
                  fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                  fontWeight: 500,
                  fontSize: "18px",
                  color: "var(--color-text)",
                }}
              >
                Editar {editing.tipo === "clase" ? "Clase" : TIPO_LABELS[editing.tipo] || "Archivo"}
              </h3>
              <button
                onClick={() => setEditing(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)" }}
              >
                <X style={{ width: "18px", height: "18px" }} />
              </button>
            </div>

            <div className="space-y-4">
              {editing.tipo === "clase" ? (
                <>
                  <div>
                    <label htmlFor="manage-numero" style={labelStyle}>Número</label>
                    <input
                      id="manage-numero"
                      type="number"
                      value={editing.data.numero as number}
                      onChange={(e) => setEditing({ ...editing, data: { ...editing.data, numero: Number(e.target.value) } })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label htmlFor="manage-titulo" style={labelStyle}>Título</label>
                    <input
                      id="manage-titulo"
                      type="text"
                      value={editing.data.titulo as string}
                      onChange={(e) => setEditing({ ...editing, data: { ...editing.data, titulo: e.target.value } })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label htmlFor="manage-tema" style={labelStyle}>Tema (opcional)</label>
                    <input
                      id="manage-tema"
                      type="text"
                      value={(editing.data.tema as string) || ""}
                      onChange={(e) => setEditing({ ...editing, data: { ...editing.data, tema: e.target.value } })}
                      placeholder="Ej: Teoría del contrato"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label htmlFor="manage-fecha" style={labelStyle}>Fecha</label>
                    <input
                      id="manage-fecha"
                      type="date"
                      value={editing.data.fecha as string}
                      onChange={(e) => setEditing({ ...editing, data: { ...editing.data, fecha: e.target.value } })}
                      style={inputStyle}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label htmlFor="manage-nombre" style={labelStyle}>Nombre</label>
                    <input
                      id="manage-nombre"
                      type="text"
                      value={editing.data.nombre_display as string}
                      onChange={(e) => setEditing({ ...editing, data: { ...editing.data, nombre_display: e.target.value } })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label htmlFor="manage-nota" style={labelStyle}>Nota (opcional)</label>
                    <textarea
                      id="manage-nota"
                      value={(editing.data.nota as string) || ""}
                      onChange={(e) => setEditing({ ...editing, data: { ...editing.data, nota: e.target.value } })}
                      placeholder="Ej: El audio empieza en el minuto 3"
                      rows={3}
                      style={{
                        ...inputStyle,
                        resize: "vertical",
                        minHeight: "80px",
                      }}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditing(null)}
                style={{ ...actionBtnStyle, padding: "10px 20px" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleEdit}
                disabled={processing}
                style={{
                  ...actionBtnStyle,
                  padding: "10px 20px",
                  background: "var(--color-gold)",
                  color: "var(--color-ink)",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {processing ? <Loader2 style={{ width: "14px", height: "14px", animation: "spin 1s linear infinite" }} /> : <Check style={{ width: "14px", height: "14px" }} />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleting && (
        <div style={modalBackdrop} onClick={(e) => { if (e.target === e.currentTarget) setDeleting(null); }}>
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div
                className="flex items-center justify-center mx-auto mb-4"
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  border: "1px solid rgba(224, 85, 85, 0.4)",
                }}
              >
                <X style={{ width: "20px", height: "20px", color: "#E05555" }} />
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                  fontWeight: 500,
                  fontSize: "18px",
                  color: "var(--color-text)",
                  marginBottom: "8px",
                }}
              >
                Eliminar {deleting.tipo === "clase" ? "Clase" : TIPO_LABELS[deleting.tipo] || "Archivo"}
              </h3>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--color-text-muted)",
                  lineHeight: 1.6,
                  marginBottom: "20px",
                }}
              >
                ¿Estás seguro de que querés eliminar <span style={{ color: "var(--color-text)", fontWeight: 500 }}>&quot;{deleting.nombre}&quot;</span>?
                {deleting.tipo === "clase" && " Se eliminarán todos los archivos asociados."}
                <br />
                <br />
                Esta acción no se puede deshacer.
              </p>

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setDeleting(null)}
                  style={{ ...actionBtnStyle, padding: "10px 20px" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={processing}
                  style={{
                    padding: "10px 20px",
                    fontSize: "13px",
                    fontWeight: 600,
                    fontFamily: "var(--font-inter)",
                    background: "#E05555",
                    color: "#fff",
                    border: "none",
                    borderRadius: 0,
                    cursor: processing ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    opacity: processing ? 0.6 : 1,
                  }}
                >
                  {processing ? <Loader2 style={{ width: "14px", height: "14px", animation: "spin 1s linear infinite" }} /> : <X style={{ width: "14px", height: "14px" }} />}
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Replace Modal */}
      {replacing && (
        <div style={modalBackdrop} onClick={(e) => { if (e.target === e.currentTarget) cerrarReplace(); }}>
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3
                style={{
                  fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                  fontWeight: 500,
                  fontSize: "18px",
                  color: "var(--color-text)",
                }}
              >
                Reemplazar Archivo
              </h3>
              <button
                onClick={cerrarReplace}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)" }}
              >
                <X style={{ width: "18px", height: "18px" }} />
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "16px" }}>
              Reemplazar <span style={{ color: "var(--color-text)", fontWeight: 500 }}>&quot;{replacing.nombre}&quot;</span>
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="replace-nombre" style={labelStyle}>Nombre</label>
                <input
                  id="replace-nombre"
                  type="text"
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {(replacing.tipo === "audio_clase") && (
                <>
                  <div>
                    <label htmlFor="replace-cloudinary" style={labelStyle}>Link de Cloudinary (opcional)</label>
                    <input
                      id="replace-cloudinary"
                      type="url"
                      value={newCloudinaryUrl}
                      onChange={(e) => setNewCloudinaryUrl(e.target.value)}
                      placeholder="https://res.cloudinary.com/.../video/audio.mp3"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>O subir archivo de audio</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: "1px dashed var(--color-line)",
                      borderRadius: 0,
                      padding: "24px",
                      textAlign: "center",
                      cursor: "pointer",
                    }}
                  >
                    {newFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <Check style={{ width: "18px", height: "18px", color: "var(--color-gold)" }} />
                        <span style={{ fontSize: "13px", color: "var(--color-text)" }}>{newFile.name}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setNewFile(null); }}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)" }}
                        >
                          <X style={{ width: "14px", height: "14px" }} />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <Upload style={{ width: "28px", height: "28px", color: "var(--color-text-faint)", margin: "0 auto 8px", display: "block" }} />
                        <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Seleccioná el archivo nuevo</p>
                      </div>
                    )}
                  </div>
                      <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                    style={{ display: "none" }}
                  />
                  </div>
                </>
              )}

              {(replacing.tipo === "archivo" || replacing.tipo === "punteo_clase" || replacing.tipo === "cuestionario") && (
                <div>
                  <label style={labelStyle}>Archivo nuevo (o pegá un link)</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: "1px dashed var(--color-line)",
                      borderRadius: 0,
                      padding: "24px",
                      textAlign: "center",
                      cursor: "pointer",
                      marginBottom: "16px",
                    }}
                  >
                    {newFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <Check style={{ width: "18px", height: "18px", color: "var(--color-gold)" }} />
                        <span style={{ fontSize: "13px", color: "var(--color-text)" }}>{newFile.name}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setNewFile(null); }}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)" }}
                        >
                          <X style={{ width: "14px", height: "14px" }} />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <Upload style={{ width: "28px", height: "28px", color: "var(--color-text-faint)", margin: "0 auto 8px", display: "block" }} />
                        <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Seleccioná un archivo nuevo</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                    style={{ display: "none" }}
                  />
                  <input
                    type="url"
                    value={newDriveLink}
                    onChange={(e) => setNewDriveLink(e.target.value)}
                    placeholder="O pegá un link externo (https://...)"
                    style={inputStyle}
                  />
                </div>
              )}

              {(replacing.tipo === "enlace" || replacing.tipo === "transcripcion") && (
                <div>
                  <label htmlFor="replace-drive" style={labelStyle}>{replacing.tipo === "enlace" ? "Enlace" : "Link de Google Drive"}</label>
                  <input
                    id="replace-drive"
                    type="url"
                    value={newDriveLink}
                    onChange={(e) => setNewDriveLink(e.target.value)}
                    placeholder={replacing.tipo === "enlace" ? "https://..." : "https://drive.google.com/file/d/..."}
                    style={inputStyle}
                  />
                </div>
              )}

              {(replacing.tipo === "youtube" || replacing.tipo === "clase_youtube") && (
                <div>
                  <label htmlFor="replace-youtube" style={labelStyle}>Link de YouTube</label>
                  <input
                    id="replace-youtube"
                    type="url"
                    value={newYoutubeUrl}
                    onChange={(e) => setNewYoutubeUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    style={inputStyle}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={cerrarReplace}
                style={{ ...actionBtnStyle, padding: "10px 20px" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleReplace}
                disabled={processing}
                style={{
                  ...actionBtnStyle,
                  padding: "10px 20px",
                  background: "var(--color-gold)",
                  color: "var(--color-ink)",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {processing ? <Loader2 style={{ width: "14px", height: "14px", animation: "spin 1s linear infinite" }} /> : <Upload style={{ width: "14px", height: "14px" }} />}
                Reemplazar
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={jsonFileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleAdjuntarJson(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
