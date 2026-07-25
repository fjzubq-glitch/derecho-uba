"use client";

import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { ArrowLeft, Calendar, Headphones, FileText, Play, ExternalLink, Loader2, X, Check, Upload } from "@/components/icons";

interface Archivo {
  id: string;
  tipo: string;
  nombre_display: string;
  storage_key: string | null;
  youtube_url: string | null;
  play_count: number;
}

interface Clase {
  id: string;
  numero: number;
  titulo: string;
  fecha: string | null;
  materia_nombre: string;
  materia_slug: string;
  archivos: Archivo[];
}

interface EditData {
  tipo: "clase" | "archivo";
  id: string;
  data: Record<string, string | number>;
}

export default function AdminManage() {
  const [clases, setClases] = useState<Clase[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditData | null>(null);
  const [deleting, setDeleting] = useState<{ tipo: string; id: string; nombre: string } | null>(null);
  const [replacing, setReplacing] = useState<{ archivoId: string; nombre: string; tipo: string } | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newDriveLink, setNewDriveLink] = useState("");
  const [newYoutubeUrl, setNewYoutubeUrl] = useState("");
  const [newNombre, setNewNombre] = useState("");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadClases();
  }, []);

  async function loadClases() {
    setLoading(true);

    const { data: clasesData } = await supabase
      .from("clases")
      .select(`
        id,
        numero,
        titulo,
        fecha,
        materias!inner(nombre, slug)
      `)
      .order("numero");

    if (clasesData) {
      const clasesWithFiles = await Promise.all(
        clasesData.map(async (c: any) => {
          const { data: archivos } = await supabase
            .from("archivos")
            .select("id, tipo, nombre_display, storage_key, youtube_url, play_count")
            .eq("clase_id", c.id)
            .order("created_at");

          return {
            id: c.id,
            numero: c.numero,
            titulo: c.titulo,
            fecha: c.fecha,
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
      if (replacing.tipo === "audio_clase" || replacing.tipo === "podcast") {
        if (!newFile) {
          setMessage("Error: seleccioná un archivo");
          setProcessing(false);
          return;
        }
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
      } else if (replacing.tipo === "youtube") {
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
      setNewNombre("");
      loadClases();
    } catch (err) {
      setMessage("Error: " + String(err));
    } finally {
      setProcessing(false);
    }
  }

  const TIPO_ICONS: Record<string, React.ReactNode> = {
    audio_clase: <Headphones className="w-4 h-4" />,
    podcast: <Play className="w-4 h-4" />,
    transcripcion: <FileText className="w-4 h-4" />,
    youtube: <ExternalLink className="w-4 h-4" />,
  };

  const canReplace = (tipo: string) => tipo === "audio_clase" || tipo === "podcast" || tipo === "transcripcion" || tipo === "youtube";

  return (
    <div className="space-y-6">
      {message && (
        <GlassCard className={`p-4 ${message.startsWith("Error") ? "border-red-500/30" : "border-green-500/30"}`}>
          <p className={`text-sm ${message.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
            {message}
          </p>
        </GlassCard>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
        </div>
      ) : clases.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <p className="text-gray-400">No hay clases cargadas</p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {clases.map((clase) => (
            <GlassCard key={clase.id} className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-violet-400">
                      {clase.materia_nombre}
                    </span>
                    <span className="text-xs text-gray-600">•</span>
                    <span className="text-xs font-medium text-gray-400">
                      CLASE {clase.numero.toString().padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white">{clase.titulo}</h3>
                  {clase.fecha && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(clase.fecha).toLocaleDateString("es-AR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditing({
                      tipo: "clase",
                      id: clase.id,
                      data: { titulo: clase.titulo, fecha: clase.fecha || "", numero: clase.numero }
                    })}
                    className="px-3 py-1.5 text-xs font-medium text-violet-400 hover:text-white bg-violet-500/10 hover:bg-violet-500/20 rounded-lg transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setDeleting({ tipo: "clase", id: clase.id, nombre: clase.titulo })}
                    className="px-3 py-1.5 text-xs font-medium text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                  >
                    Borrar
                  </button>
                </div>
              </div>

              {clase.archivos.length > 0 && (
                <div className="space-y-2">
                  {clase.archivos.map((archivo) => (
                    <div key={archivo.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400">
                        {TIPO_ICONS[archivo.tipo]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{archivo.nombre_display}</p>
                        <p className="text-xs text-gray-500">
                          {archivo.tipo.replace("_", " ")} • {archivo.play_count} reproducciones
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {canReplace(archivo.tipo) && (
                          <button
                            onClick={() => {
                              setReplacing({ archivoId: archivo.id, nombre: archivo.nombre_display, tipo: archivo.tipo });
                              setNewFile(null);
                              setNewDriveLink("");
                              setNewYoutubeUrl("");
                              setNewNombre(archivo.nombre_display);
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-amber-400 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors"
                          >
                            Reemplazar
                          </button>
                        )}
                        <button
                          onClick={() => setEditing({
                            tipo: "archivo",
                            id: archivo.id,
                            data: { nombre_display: archivo.nombre_display }
                          })}
                          className="px-3 py-1.5 text-xs font-medium text-violet-400 hover:text-white bg-violet-500/10 hover:bg-violet-500/20 rounded-lg transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setDeleting({ tipo: "archivo", id: archivo.id, nombre: archivo.nombre_display })}
                          className="px-3 py-1.5 text-xs font-medium text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                          Borrar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <GlassCard className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">
                Editar {editing.tipo === "clase" ? "Clase" : "Archivo"}
              </h3>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {editing.tipo === "clase" ? (
                <>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Número</label>
                    <input
                      type="number"
                      value={editing.data.numero as number}
                      onChange={(e) => setEditing({ ...editing, data: { ...editing.data, numero: Number(e.target.value) } })}
                      className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Título</label>
                    <input
                      type="text"
                      value={editing.data.titulo as string}
                      onChange={(e) => setEditing({ ...editing, data: { ...editing.data, titulo: e.target.value } })}
                      className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Fecha</label>
                    <input
                      type="date"
                      value={editing.data.fecha as string}
                      onChange={(e) => setEditing({ ...editing, data: { ...editing.data, fecha: e.target.value } })}
                      className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={editing.data.nombre_display as string}
                    onChange={(e) => setEditing({ ...editing, data: { ...editing.data, nombre_display: e.target.value } })}
                    className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button onClick={() => setEditing(null)} className="bg-white/[0.05] hover:bg-white/[0.1]">
                Cancelar
              </Button>
              <Button onClick={handleEdit} disabled={processing}>
                {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                Guardar
              </Button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Delete Modal */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <GlassCard className="w-full max-w-md p-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Eliminar {deleting.tipo === "clase" ? "Clase" : "Archivo"}
              </h3>
              <p className="text-sm text-gray-400 mb-6">
                ¿Estás seguro de que querés eliminar <span className="text-white font-medium">"{deleting.nombre}"</span>?
                {deleting.tipo === "clase" && " Se eliminarán todos los archivos asociados."}
                <br /><br />
                Esta acción no se puede deshacer.
              </p>

              <div className="flex justify-center gap-3">
                <Button onClick={() => setDeleting(null)} className="bg-white/[0.05] hover:bg-white/[0.1]">
                  Cancelar
                </Button>
                <Button onClick={handleDelete} disabled={processing} className="bg-red-600 hover:bg-red-500">
                  {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
                  Eliminar
                </Button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Replace Modal */}
      {replacing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <GlassCard className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Reemplazar Archivo</h3>
              <button onClick={() => { setReplacing(null); setNewFile(null); setNewDriveLink(""); setNewYoutubeUrl(""); }} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-400 mb-4">
              Reemplazar <span className="text-white font-medium">"{replacing.nombre}"</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nombre</label>
                <input
                  type="text"
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50"
                />
              </div>

              {(replacing.tipo === "audio_clase" || replacing.tipo === "podcast") && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Archivo de audio</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/[0.15] rounded-xl p-6 text-center cursor-pointer hover:border-violet-500/40 transition-colors"
                  >
                    {newFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <Check className="w-5 h-5 text-green-400" />
                        <span className="text-sm text-white">{newFile.name}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setNewFile(null); }}
                          className="ml-2"
                        >
                          <X className="w-4 h-4 text-gray-400 hover:text-white" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Seleccioná el archivo nuevo</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </div>
              )}

              {replacing.tipo === "transcripcion" && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Link de Google Drive</label>
                  <input
                    type="url"
                    value={newDriveLink}
                    onChange={(e) => setNewDriveLink(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                    className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
                  />
                </div>
              )}

              {replacing.tipo === "youtube" && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Link de YouTube</label>
                  <input
                    type="url"
                    value={newYoutubeUrl}
                    onChange={(e) => setNewYoutubeUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button onClick={() => { setReplacing(null); setNewFile(null); setNewDriveLink(""); setNewYoutubeUrl(""); }} className="bg-white/[0.05] hover:bg-white/[0.1]">
                Cancelar
              </Button>
              <Button onClick={handleReplace} disabled={processing}>
                {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Reemplazar
              </Button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
