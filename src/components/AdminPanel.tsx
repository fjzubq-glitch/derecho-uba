"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, Loader2, Lock, Plus, Search, StickyNote, Trash2, Edit3, X, BookOpen } from "@/components/icons";
import FichaEditor from "@/components/FichaEditor";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--color-ink)",
  border: "1px solid var(--color-line-soft)",
  borderRadius: 0,
  padding: "10px 14px",
  fontSize: "13px",
  fontFamily: "var(--font-inter)",
  color: "var(--color-text)",
  outline: "none",
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

interface MateriaRef {
  id: string;
  nombre: string;
  slug: string;
}

interface Ficha {
  id: string;
  titulo: string;
  contenido: string;
  materia_id: string | null;
  materia_nombre: string | null;
  materia_slug: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface PanelArchivo {
  id: string;
  tipo: "cuestionario" | "material_privado";
  nombre_display: string;
  storage_key: string | null;
  youtube_url: string | null;
  cloudinary_url: string | null;
  nota: string | null;
  play_count: number;
  clase_id: string | null;
  created_at: string;
  materia_nombre: string | null;
  materia_slug: string | null;
  clase_numero: number | null;
  clase_titulo: string | null;
}

const MODAL_STYLE: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.65)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  padding: "48px 16px",
  zIndex: 100,
  overflowY: "auto",
};

const MODAL_BOX: React.CSSProperties = {
  background: "var(--color-card)",
  border: "1px solid var(--color-line-soft)",
  padding: "28px",
  width: "100%",
  maxWidth: "820px",
  borderRadius: 0,
};

export default function AdminPanel() {
  const [loading, setLoading] = useState(true);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [archivos, setArchivos] = useState<PanelArchivo[]>([]);
  const [materias, setMaterias] = useState<MateriaRef[]>([]);
  const [busqueda, setBusqueda] = useState("");

  const [editorAbierto, setEditorAbierto] = useState<{ id: string | null; titulo: string; contenido: string; materiaId: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [vistaFicha, setVistaFicha] = useState<Ficha | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/admin/panel");
    if (!res.ok) {
      setErrorMsg("No se pudo cargar el panel.");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setFichas(data.fichas || []);
    setArchivos(data.archivos || []);
    setMaterias(data.materias || []);
    setErrorMsg(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirNueva = () => {
    setEditorAbierto({ id: null, titulo: "", contenido: "", materiaId: materias[0]?.id ?? "" });
  };

  const abrirEditar = (f: Ficha) => {
    setEditorAbierto({ id: f.id, titulo: f.titulo, contenido: f.contenido, materiaId: f.materia_id ?? "" });
  };

  const guardarFicha = async (titulo: string, contenido: string) => {
    if (!editorAbierto) return;
    setGuardando(true);
    setErrorMsg(null);
    try {
      const res = await fetch(editorAbierto.id ? `/api/fichas/${editorAbierto.id}` : "/api/fichas", {
        method: editorAbierto.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, contenido, materia_id: editorAbierto.materiaId || null }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al guardar");
      }
      setEditorAbierto(null);
      await cargar();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  const borrarFicha = async (id: string) => {
    if (!window.confirm("¿Seguro que querés borrar esta ficha?")) return;
    const res = await fetch(`/api/fichas/${id}`, { method: "DELETE" });
    if (res.ok) await cargar();
  };

  const borrarArchivo = async (id: string) => {
    if (!window.confirm("¿Seguro que querés borrar este elemento?")) return;
    const res = await fetch(`/api/admin?id=${id}&tipo=archivo`, { method: "DELETE" });
    if (res.ok) await cargar();
  };

  const abrirVisor = (a: PanelArchivo) => {
    if (a.tipo === "cuestionario") {
      let url = `/visor/${a.id}?nombre=${encodeURIComponent(a.nombre_display)}`;
      fetch(`/api/admin/visor-token?id=${a.id}`)
        .then((r) => r.json())
        .then(({ token }) => {
          if (token) url += `&t=${encodeURIComponent(token)}`;
          window.open(url, "_blank");
        })
        .catch(() => window.open(url, "_blank"));
    } else {
      if (a.youtube_url) {
        window.open(a.youtube_url, "_blank");
      } else if (a.storage_key) {
        window.open(`/api/stream/${a.id}`, "_blank");
      }
    }
  };

  const abrirCuestionarioHtml = (id: string) => {
    window.open(`/api/admin/cuestionario/${id}/html`, "_blank");
  };

  const filtradas = fichas.filter((f) => {
    const q = busqueda.toLowerCase();
    return (
      f.titulo.toLowerCase().includes(q) ||
      (f.materia_nombre || "").toLowerCase().includes(q) ||
      (f.tags || []).join(" ").toLowerCase().includes(q)
    );
  });

  const archivosFiltrados = archivos.filter((a) =>
    busqueda ? a.nombre_display.toLowerCase().includes(busqueda.toLowerCase()) || (a.materia_nombre || "").toLowerCase().includes(busqueda.toLowerCase()) : true
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2" style={{ padding: "40px 0", color: "var(--color-text-muted)", fontFamily: "var(--font-ibm-plex-mono)", fontSize: "12px" }}>
        <Loader2 style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} /> Cargando tu espacio…
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {errorMsg && (
        <div style={{ padding: "10px 14px", background: "rgba(224,85,85,0.08)", border: "1px solid rgba(224,85,85,0.3)", borderRadius: 0 }}>
          <p style={{ fontSize: "12px", color: "#E05555" }}>{errorMsg}</p>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div style={{ flex: 1, minWidth: "240px", maxWidth: "420px" }}>
          <label style={labelStyle}>Buscar</label>
          <div style={{ position: "relative" }}>
            <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", width: "16px", height: "16px", color: "var(--color-text-faint)" }} />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar ficha, materia…"
              aria-label="Buscar"
              style={{ ...inputStyle, paddingLeft: "38px" }}
            />
          </div>
        </div>
        <button
          onClick={abrirNueva}
          style={{ background: "var(--color-gold)", color: "var(--color-ink)", border: "none", padding: "10px 18px", cursor: "pointer", fontFamily: "var(--font-inter)", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px", fontWeight: 500 }}
        >
          <Plus style={{ width: "16px", height: "16px" }} />
          Nueva ficha
        </button>
      </div>

      {/* Fichas */}
      <section>
        <h3 style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 400, fontSize: "20px", color: "var(--color-text)", marginBottom: "16px" }}>
          Fichas de estudio
          <span style={{ fontSize: "13px", color: "var(--color-text-faint)", fontFamily: "var(--font-ibm-plex-mono)", marginLeft: "10px" }}>{filtradas.length}</span>
        </h3>
        {filtradas.length === 0 ? (
          <p style={{ fontSize: "13px", color: "var(--color-text-faint)", fontFamily: "var(--font-ibm-plex-mono)" }}>
            {busqueda ? "Sin resultados." : "Todavía no creaste ninguna ficha. Tocá “Nueva ficha” para empezar."}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: "1px", background: "var(--color-line-soft)", border: "1px solid var(--color-line-soft)" }}>
            {filtradas.map((f) => (
              <div
                key={f.id}
                style={{ background: "var(--color-card)", padding: "20px 22px", display: "flex", flexDirection: "column", gap: "8px", minHeight: "140px" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1" style={{ cursor: "pointer" }} onClick={() => setVistaFicha(f)}>
                    <div className="flex items-center justify-center" style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1px solid var(--color-gold-dim)", flexShrink: 0 }}>
                      <StickyNote style={{ width: "16px", height: "16px", color: "var(--color-gold)" }} />
                    </div>
                    <h4 style={{ fontFamily: "var(--font-fraunces), serif", fontSize: "16px", color: "var(--color-text)", fontWeight: 500, lineHeight: 1.3 }}>{f.titulo}</h4>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => abrirEditar(f)} title="Editar" style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--color-text-muted)" }}>
                      <Edit3 style={{ width: "14px", height: "14px" }} />
                    </button>
                    <button onClick={() => borrarFicha(f.id)} title="Borrar" style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--color-text-faint)" }}>
                      <Trash2 style={{ width: "14px", height: "14px" }} />
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "auto" }}>
                  <BookOpen style={{ width: "13px", height: "13px", color: "var(--color-gold-dim)" }} />
                  <span style={{ fontSize: "11px", color: "var(--color-text-faint)", fontFamily: "var(--font-ibm-plex-mono)" }}>
                    {f.materia_nombre || "Sin materia"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Material privado y cuestionarios */}
      <section>
        <h3 style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 400, fontSize: "20px", color: "var(--color-text)", marginBottom: "16px" }}>
          Material privado y cuestionarios
          <span style={{ fontSize: "13px", color: "var(--color-text-faint)", fontFamily: "var(--font-ibm-plex-mono)", marginLeft: "10px" }}>{archivosFiltrados.length}</span>
        </h3>
        {archivosFiltrados.length === 0 ? (
          <p style={{ fontSize: "13px", color: "var(--color-text-faint)", fontFamily: "var(--font-ibm-plex-mono)" }}>
            {busqueda ? "Sin resultados." : "Subí cuestionarios y material privado desde “Subir contenido”."}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: "1px", background: "var(--color-line-soft)", border: "1px solid var(--color-line-soft)" }}>
            {archivosFiltrados.map((a) => (
              <div key={a.id} style={{ background: "var(--color-card)", padding: "20px 22px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center justify-center" style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1px solid var(--color-gold-dim)", flexShrink: 0 }}>
                      {a.tipo === "cuestionario" ? <Check style={{ width: "16px", height: "16px", color: "var(--color-gold)" }} /> : <Lock style={{ width: "16px", height: "16px", color: "var(--color-gold)" }} />}
                    </div>
                    <span style={{ fontSize: "11px", color: "var(--color-text-faint)", fontFamily: "var(--font-ibm-plex-mono)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      {a.tipo === "cuestionario" ? "Cuestionario" : "Material privado"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {a.tipo === "cuestionario" && (
                      <button onClick={() => abrirCuestionarioHtml(a.id)} title="Ver HTML" style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--color-text-muted)" }}>
                        <Edit3 style={{ width: "14px", height: "14px" }} />
                      </button>
                    )}
                    <button onClick={() => abrirVisor(a)} title="Abrir" style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--color-text-muted)" }}>
                      <ExternalLink style={{ width: "14px", height: "14px" }} />
                    </button>
                    <button onClick={() => borrarArchivo(a.id)} title="Borrar" style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--color-text-faint)" }}>
                      <Trash2 style={{ width: "14px", height: "14px" }} />
                    </button>
                  </div>
                </div>
                <h4 style={{ fontFamily: "var(--font-fraunces), serif", fontSize: "16px", color: "var(--color-text)", fontWeight: 500, lineHeight: 1.3 }}>
                  {a.nombre_display}
                </h4>
                <div style={{ fontSize: "11px", color: "var(--color-text-faint)", fontFamily: "var(--font-ibm-plex-mono)", marginTop: "auto" }}>
                  {a.materia_nombre || "Sin materia"}{a.clase_numero ? ` · Clase ${a.clase_numero}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Editor modal */}
      {editorAbierto && (
        <div style={MODAL_STYLE} onClick={(e) => { if (e.target === e.currentTarget) setEditorAbierto(null); }}>
          <div style={MODAL_BOX}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 400, fontSize: "20px", color: "var(--color-text)" }}>
                {editorAbierto.id ? "Editar ficha" : "Nueva ficha"}
              </h3>
              <button onClick={() => setEditorAbierto(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)" }}>
                <X style={{ width: "20px", height: "20px" }} />
              </button>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Materia</label>
              <select value={editorAbierto.materiaId} onChange={(e) => setEditorAbierto({ ...editorAbierto, materiaId: e.target.value })} style={inputStyle}>
                <option value="">Sin materia</option>
                {materias.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </div>
            <FichaEditor
              initialTitulo={editorAbierto.titulo}
              initialContenido={editorAbierto.contenido}
              onSave={guardarFicha}
              onCancel={() => setEditorAbierto(null)}
              saving={guardando}
            />
          </div>
        </div>
      )}

      {/* Vista de ficha modal */}
      {vistaFicha && (
        <div style={MODAL_STYLE} onClick={(e) => { if (e.target === e.currentTarget) setVistaFicha(null); }}>
          <div style={{ ...MODAL_BOX, maxWidth: "640px" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 500, fontSize: "22px", color: "var(--color-text)" }}>{vistaFicha.titulo}</h3>
              <button onClick={() => setVistaFicha(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)" }}>
                <X style={{ width: "20px", height: "20px" }} />
              </button>
            </div>
            <div style={{ fontSize: "12px", color: "var(--color-text-faint)", fontFamily: "var(--font-ibm-plex-mono)", marginBottom: "16px" }}>
              {vistaFicha.materia_nombre || "Sin materia"} · Actualizada {new Date(vistaFicha.updated_at).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
            </div>
            <div className="ficha-view" dangerouslySetInnerHTML={{ __html: vistaFicha.contenido }} />
            <div className="flex justify-end gap-3" style={{ marginTop: "24px", borderTop: "1px solid var(--color-line-soft)", paddingTop: "16px" }}>
              <button onClick={() => { const f = vistaFicha; setVistaFicha(null); abrirEditar(f); }} style={{ background: "none", border: "1px solid var(--color-line)", color: "var(--color-text-muted)", padding: "10px 20px", cursor: "pointer", fontFamily: "var(--font-inter)" }}>
                Editar
              </button>
              <button onClick={() => setVistaFicha(null)} style={{ background: "var(--color-gold)", color: "var(--color-ink)", border: "none", padding: "10px 20px", cursor: "pointer", fontFamily: "var(--font-inter)" }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
