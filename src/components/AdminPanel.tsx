"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, FileText, Loader2, Lock, Plus, Search, StickyNote, Trash2, Edit3, X, BookOpen, Calendar } from "@/components/icons";
import FichaEditor from "@/components/FichaEditor";
import { diasHasta, countdownLabel, formatearFechaCorta } from "@/lib/fechas";
import { formatFechaLocal } from "@/lib/utils";

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
  materia_id: string | null;
  materia_nombre: string | null;
  materia_slug: string | null;
  clase_numero: number | null;
  clase_titulo: string | null;
}

interface PanelClase {
  id: string;
  materia_id: string;
  numero: number;
  titulo: string;
  tema: string | null;
  fecha: string | null;
  materia_nombre: string | null;
  materia_slug: string | null;
}

interface PanelFecha {
  id: string;
  materia_id: string;
  titulo: string;
  fecha: string;
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
  const [clases, setClases] = useState<PanelClase[]>([]);
  const [fechas, setFechas] = useState<PanelFecha[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cuadernoActualId, setCuadernoActualId] = useState<string | null>(null);

  const [editorAbierto, setEditorAbierto] = useState<{ id: string | null; titulo: string; contenido: string; materiaId: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [vistaFicha, setVistaFicha] = useState<Ficha | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ message: string; onConfirm: () => void } | null>(null);

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
    setClases(data.clases || []);
    setFechas(data.fechas || []);
    setErrorMsg(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirNueva = () => {
    setEditorAbierto({ id: null, titulo: "", contenido: "", materiaId: cuadernoActualId ?? materias[0]?.id ?? "" });
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

  const borrarFicha = (id: string) => {
    setConfirmState({
      message: "¿Seguro que querés borrar esta ficha? Esta acción no se puede deshacer.",
      onConfirm: async () => {
        setConfirmState(null);
        const res = await fetch(`/api/fichas/${id}`, { method: "DELETE" });
        if (res.ok) await cargar();
      },
    });
  };

  const borrarArchivo = (id: string) => {
    setConfirmState({
      message: "¿Seguro que querés borrar este elemento? Esta acción no se puede deshacer.",
      onConfirm: async () => {
        setConfirmState(null);
        const res = await fetch(`/api/admin?id=${id}&tipo=archivo`, { method: "DELETE" });
        if (res.ok) await cargar();
      },
    });
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

  const cuadernos = materias.map((m) => ({
    ...m,
    fichaCount: fichas.filter((f) => f.materia_id === m.id).length,
    archivoCount: archivos.filter((a) => a.materia_id === m.id).length,
  }));

  const cuadernoActual = materias.find((m) => m.id === cuadernoActualId) ?? null;

  const filtradas = cuadernoActualId
    ? fichas.filter((f) => f.materia_id === cuadernoActualId)
    : fichas.filter((f) => {
        const q = busqueda.toLowerCase();
        return (
          f.titulo.toLowerCase().includes(q) ||
          (f.materia_nombre || "").toLowerCase().includes(q) ||
          (f.tags || []).join(" ").toLowerCase().includes(q)
        );
      });

  const archivosFiltrados = cuadernoActualId
    ? archivos.filter((a) => a.materia_id === cuadernoActualId)
    : archivos.filter((a) => {
        const q = busqueda.toLowerCase();
        return q ? a.nombre_display.toLowerCase().includes(q) || (a.materia_nombre || "").toLowerCase().includes(q) : true;
      });

  const fichasSinMateria = fichas.filter((f) => !f.materia_id);
  const archivosSinMateria = archivos.filter((a) => !a.materia_id);

  const clasesDelCuaderno = cuadernoActualId
    ? clases.filter((c) => c.materia_id === cuadernoActualId).sort((a, b) => a.numero - b.numero)
    : [];

  const fechasDelCuaderno = cuadernoActualId
    ? fechas.filter((f) => f.materia_id === cuadernoActualId).sort((a, b) => a.fecha.localeCompare(b.fecha))
    : [];

  const renderFichas = (items: Ficha[]) =>
    items.length === 0 ? (
      <p style={{ fontSize: "13px", color: "var(--color-text-faint)", fontFamily: "var(--font-ibm-plex-mono)" }}>
        Todavía no creaste ninguna ficha en este cuaderno. Tocá &quot;Nueva ficha&quot;.
      </p>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((f) => (
          <div
            key={f.id}
            className="card-reveal card-hover"
            style={{ background: "var(--color-card)", padding: "28px 24px", display: "flex", flexDirection: "column", gap: "10px", minHeight: "150px", border: "1px solid var(--color-line-soft)", transition: "background 0.25s ease, border-color 0.25s ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-card-hover)"; e.currentTarget.style.borderColor = "var(--color-gold-dim)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-card)"; e.currentTarget.style.borderColor = "var(--color-line-soft)"; }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 flex-1" style={{ cursor: "pointer" }} onClick={() => setVistaFicha(f)}>
                <div className="flex items-center justify-center flex-shrink-0" style={{ width: "40px", height: "40px", borderRadius: "50%", border: "1px solid var(--color-gold-dim)" }}>
                  <StickyNote style={{ width: "18px", height: "18px", color: "var(--color-gold)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-gold)", display: "block", marginBottom: "6px" }}>
                    FICHA
                  </span>
                  <h4 style={{ fontFamily: "var(--font-fraunces), serif", fontSize: "18px", color: "var(--color-text)", fontWeight: 500, lineHeight: 1.3, overflowWrap: "break-word" }}>{f.titulo}</h4>
                </div>
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
          </div>
        ))}
      </div>
    );

  const renderArchivos = (items: PanelArchivo[]) => {
    if (items.length === 0) {
      return <p style={{ fontSize: "13px", color: "var(--color-text-faint)", fontFamily: "var(--font-ibm-plex-mono)" }}>Todavía no hay material ni cuestionarios en este cuaderno.</p>;
    }

    const clasesMap = new Map<number, { titulo: string; archivos: PanelArchivo[] }>();
    for (const a of items) {
      const num = a.clase_numero ?? 9999;
      if (!clasesMap.has(num)) {
        clasesMap.set(num, { titulo: a.clase_titulo || "", archivos: [] });
      }
      clasesMap.get(num)!.archivos.push(a);
    }

    const clasesOrdenadas = Array.from(clasesMap.entries()).sort(([a], [b]) => a - b);

    return (
      <div className="space-y-8">
        {clasesOrdenadas.map(([num, clase]) => {
          const cuestionarios = clase.archivos.filter((a) => a.tipo === "cuestionario");
          const materiales = clase.archivos.filter((a) => a.tipo === "material_privado");
          const todos = [...cuestionarios, ...materiales];

          return (
            <div
              key={num}
              style={{
                background: "var(--color-ink-2)",
                border: "1px solid var(--color-line-soft)",
                borderRadius: "2px",
                padding: "24px 28px 28px",
              }}
            >
              <div className="flex items-center gap-3 mb-6" style={{ paddingBottom: "16px", borderBottom: "1px solid var(--color-line-soft)" }}>
                <div
                  className="flex items-center justify-center"
                  style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1px solid var(--color-gold-dim)", flexShrink: 0 }}
                >
                  <FileText style={{ width: "16px", height: "16px", color: "var(--color-gold)" }} />
                </div>
                <div>
                  <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-gold)" }}>
                    Clase {num}
                  </span>
                  {clase.titulo && (
                    <p style={{ fontFamily: "var(--font-fraunces)", fontWeight: 500, fontSize: "18px", color: "var(--color-text)", lineHeight: 1.3 }}>
                      {clase.titulo}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {todos.map((a) => (
                  <article
                    key={a.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => abrirVisor(a)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrirVisor(a); } }}
                    className="card-reveal card-hover"
                    style={{
                      background: "var(--color-card)",
                      padding: "28px 24px",
                      cursor: "pointer",
                      border: "1px solid var(--color-line-soft)",
                      transition: "background 0.25s ease, border-color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-card-hover)"; e.currentTarget.style.borderColor = "var(--color-gold-dim)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-card)"; e.currentTarget.style.borderColor = "var(--color-line-soft)"; }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center justify-center flex-shrink-0" style={{ width: "40px", height: "40px", borderRadius: "50%", border: "1px solid var(--color-gold-dim)" }}>
                          {a.tipo === "cuestionario"
                            ? <Check style={{ width: "18px", height: "18px", color: "var(--color-gold)" }} />
                            : <Lock style={{ width: "18px", height: "18px", color: "var(--color-gold)" }} />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-gold)", display: "block", marginBottom: "6px" }}>
                            {a.tipo === "cuestionario" ? "CUESTIONARIO" : "MATERIAL PRIVADO"}
                          </span>
                          <p style={{ fontFamily: "var(--font-fraunces)", fontWeight: 500, fontSize: "18px", lineHeight: 1.25, color: "var(--color-text)", overflowWrap: "break-word" }}>
                            {a.nombre_display}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {a.tipo === "cuestionario" && (
                          <button onClick={(e) => { e.stopPropagation(); abrirCuestionarioHtml(a.id); }} title="Ver HTML" style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--color-text-muted)" }}>
                            <Edit3 style={{ width: "14px", height: "14px" }} />
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); borrarArchivo(a.id); }} title="Borrar" style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--color-text-faint)" }}>
                          <Trash2 style={{ width: "14px", height: "14px" }} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

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

      {!cuadernoActualId && (
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div style={{ flex: 1, minWidth: "240px", maxWidth: "420px" }}>
          <label style={labelStyle}>Buscar</label>
          <div style={{ position: "relative" }}>
            <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", width: "16px", height: "16px", color: "var(--color-text-faint)" }} />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar cuaderno, ficha, materia…"
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
      )}

      {cuadernoActualId ? (
        /* ════════ CUADERNO (detalle) ════════ */
        <div className="space-y-12">
          <div className="flex items-center justify-between flex-wrap gap-4" style={{ padding: "8px 0 16px", borderBottom: "1px solid var(--color-line-soft)" }}>
            <div className="flex items-center gap-4">
              <button
                onClick={() => { setCuadernoActualId(null); setBusqueda(""); }}
                style={{ background: "none", border: "1px solid var(--color-line)", color: "var(--color-text-muted)", padding: "8px 14px", cursor: "pointer", fontFamily: "var(--font-inter)", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <ArrowLeft style={{ width: "14px", height: "14px" }} /> Volver
              </button>
              <h3 style={{ fontFamily: "var(--font-fraunces)", fontWeight: 400, fontSize: "26px", color: "var(--color-text)" }}>
                {cuadernoActual?.nombre}
              </h3>
            </div>
            <button
              onClick={abrirNueva}
              style={{ background: "var(--color-gold)", color: "var(--color-ink)", border: "none", padding: "10px 18px", cursor: "pointer", fontFamily: "var(--font-inter)", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px", fontWeight: 500 }}
            >
              <Plus style={{ width: "16px", height: "16px" }} />
              Nueva ficha
            </button>
          </div>

          {/* Fechas Importantes */}
          {fechasDelCuaderno.length > 0 && (
            <div className="md:w-[calc((100%-16px)/2)] lg:w-[calc((100%-32px)/3)]" style={{ marginTop: "8px" }}>
              <div
                style={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-line-soft)",
                  borderTop: "2px solid var(--color-gold-dim)",
                  borderRadius: 0,
                  padding: "24px 26px 20px",
                  transition: "border-color 0.25s ease, background 0.25s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-gold-dim)"; e.currentTarget.style.background = "var(--color-card-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-line-soft)"; e.currentTarget.style.background = "var(--color-card)"; }}
              >
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Calendar style={{ width: "14px", height: "14px", color: "var(--color-gold)", flexShrink: 0 }} />
                    <p style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-gold)" }}>
                      Fechas importantes
                    </p>
                  </div>
                  <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", letterSpacing: "0.1em", color: "var(--color-text-faint)" }}>
                    <span className="clase-num">{String(fechasDelCuaderno.length).padStart(2, "0")}</span>{" "}
                    FECHAS
                  </span>
                </div>
                {(() => {
                  const pf = fechasDelCuaderno.find((f) => diasHasta(f.fecha) >= 0);
                  if (!pf) return null;
                  const dias = diasHasta(pf.fecha);
                  return (
                    <div className="pt-4" style={{ borderTop: "1px solid var(--color-line-soft)" }}>
                      <p style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-stamp)" }}>
                        Próxima fecha
                      </p>
                      <p style={{ fontFamily: "var(--font-fraunces)", fontWeight: 500, fontSize: "19px", lineHeight: 1.25, color: "var(--color-text)", marginTop: "6px" }}>
                        {pf.titulo}
                      </p>
                      <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                        <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "12px", color: "var(--color-text-muted)" }}>
                          {formatearFechaCorta(pf.fecha, true)}
                        </span>
                        <span style={{
                          padding: "3px 10px",
                          border: `1px solid ${dias <= 7 ? "var(--color-stamp)" : "var(--color-gold-dim)"}`,
                          fontFamily: "var(--font-ibm-plex-mono)",
                          fontSize: "10px",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: dias <= 7 ? "var(--color-stamp)" : "var(--color-gold)",
                        }}>
                          {countdownLabel(dias)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Clases */}
          {clasesDelCuaderno.length > 0 && (
            <section>
              <h3 style={{ fontFamily: "var(--font-fraunces)", fontWeight: 400, fontSize: "18px", color: "var(--color-text)", marginBottom: "20px" }}>
                Clases <span style={{ fontSize: "12px", color: "var(--color-text-faint)", fontFamily: "var(--font-ibm-plex-mono)", marginLeft: "8px" }}>{clasesDelCuaderno.length}</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clasesDelCuaderno.map((clase, i) => {
                  const claseArchivos = archivosFiltrados.filter((a) => a.clase_numero === clase.numero);

                  return (
                    <article
                      key={clase.id}
                      className="card-reveal card-hover flex flex-col"
                      style={{
                        background: "var(--color-card)",
                        padding: "28px 24px",
                        animationDelay: `${i * 50}ms`,
                        transition: "background 0.25s ease, transform 0.25s ease, border-color 0.25s ease",
                        border: "1px solid var(--color-line-soft)",
                        cursor: "default",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-card-hover)"; e.currentTarget.style.borderColor = "var(--color-gold-dim)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-card)"; e.currentTarget.style.borderColor = "var(--color-line-soft)"; }}
                    >
                      <div style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-gold)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span>Clase {clase.numero.toString().padStart(2, "0")}</span>
                      </div>
                      <div className="flex-1">
                        <h4 style={{ fontFamily: "var(--font-fraunces)", fontWeight: 500, fontSize: "20px", lineHeight: 1.2, color: "var(--color-text)", marginBottom: "12px" }}>
                          {clase.tema || clase.titulo}
                        </h4>
                        {clase.tema && clase.titulo && (
                          <p style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-text-faint)", marginTop: "-6px", marginBottom: "12px" }}>
                            {clase.titulo}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-3" style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "11px", color: "var(--color-text-faint)" }}>
                        {clase.fecha ? (
                          <>
                            <Calendar style={{ width: "14px", height: "14px" }} />
                            {formatFechaLocal(clase.fecha)}
                          </>
                        ) : null}
                      </div>
                      {claseArchivos.length > 0 ? (
                        <div style={{ borderTop: "1px solid var(--color-line-soft)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                          {claseArchivos.map((a) => (
                            <div
                              key={a.id}
                              className="flex items-center justify-between gap-2"
                              style={{ padding: "8px 12px", background: "var(--color-ink)", border: "1px solid var(--color-line-soft)" }}
                            >
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className="flex items-center justify-center flex-shrink-0" style={{ width: "28px", height: "28px", borderRadius: "50%", border: "1px solid var(--color-gold-dim)" }}>
                                  {a.tipo === "cuestionario"
                                    ? <Check style={{ width: "12px", height: "12px", color: "var(--color-gold)" }} />
                                    : <Lock style={{ width: "12px", height: "12px", color: "var(--color-gold)" }} />
                                  }
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "8px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-gold)", display: "block", marginBottom: "2px" }}>
                                    {a.tipo === "cuestionario" ? "CUESTIONARIO" : "MATERIAL PRIVADO"}
                                  </span>
                                  <p style={{ fontFamily: "var(--font-fraunces)", fontWeight: 500, fontSize: "13px", lineHeight: 1.25, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {a.nombre_display}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-0.5 flex-shrink-0">
                                {a.tipo === "cuestionario" && (
                                  <button onClick={(e) => { e.stopPropagation(); abrirCuestionarioHtml(a.id); }} title="Ver HTML" style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--color-text-muted)" }}>
                                    <Edit3 style={{ width: "12px", height: "12px" }} />
                                  </button>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); borrarArchivo(a.id); }} title="Borrar" style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--color-text-faint)" }}>
                                  <Trash2 style={{ width: "12px", height: "12px" }} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ borderTop: "1px solid var(--color-line-soft)", paddingTop: "12px" }}>
                          <p style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "11px", color: "var(--color-text-faint)", fontStyle: "italic" }}>
                            Sin material aún
                          </p>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* Fichas de estudio */}
          <section>
            <h3 style={{ fontFamily: "var(--font-fraunces)", fontWeight: 400, fontSize: "18px", color: "var(--color-text)", marginBottom: "14px" }}>
              Fichas de estudio <span style={{ fontSize: "12px", color: "var(--color-text-faint)", fontFamily: "var(--font-ibm-plex-mono)", marginLeft: "8px" }}>{filtradas.length}</span>
            </h3>
            {renderFichas(filtradas)}
          </section>
        </div>
      ) : (
        /* ════════ LISTA DE CUADERNOS ════════ */
        <div className="space-y-10">
          <section>
            <h3 style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 400, fontSize: "20px", color: "var(--color-text)", marginBottom: "16px" }}>
              Cuadernos <span style={{ fontSize: "13px", color: "var(--color-text-faint)", fontFamily: "var(--font-ibm-plex-mono)", marginLeft: "10px" }}>{cuadernos.length}</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cuadernos.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setCuadernoActualId(m.id)}
                  className="card-reveal card-hover"
                  style={{ background: "var(--color-card)", padding: "28px 24px", textAlign: "left", cursor: "pointer", border: "1px solid var(--color-line-soft)", display: "flex", flexDirection: "column", gap: "12px", minHeight: "160px", width: "100%", transition: "background 0.25s ease, border-color 0.25s ease" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-card-hover)"; e.currentTarget.style.borderColor = "var(--color-gold-dim)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-card)"; e.currentTarget.style.borderColor = "var(--color-line-soft)"; }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center" style={{ width: "40px", height: "40px", borderRadius: "50%", border: "1px solid var(--color-gold-dim)", flexShrink: 0 }}>
                      <BookOpen style={{ width: "18px", height: "18px", color: "var(--color-gold)" }} />
                    </div>
                    <h4 style={{ fontFamily: "var(--font-fraunces), serif", fontSize: "20px", color: "var(--color-text)", fontWeight: 500, lineHeight: 1.3 }}>{m.nombre}</h4>
                  </div>
                  <div className="flex flex-wrap gap-2" style={{ marginTop: "auto" }}>
                    <span style={{ fontSize: "11px", color: "var(--color-text-muted)", fontFamily: "var(--font-ibm-plex-mono)", border: "1px solid var(--color-line-soft)", padding: "4px 12px" }}>
                      {m.fichaCount} fichas
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--color-text-muted)", fontFamily: "var(--font-ibm-plex-mono)", border: "1px solid var(--color-line-soft)", padding: "4px 12px" }}>
                      {m.archivoCount} material
                    </span>
                  </div>
                </button>
              ))}
            </div>
            {cuadernos.length === 0 && (
              <p style={{ fontSize: "13px", color: "var(--color-text-faint)", fontFamily: "var(--font-ibm-plex-mono)" }}>
                No hay materias en la web. Creá materias desde “Gestionar contenido”.
              </p>
            )}
          </section>

          {(fichasSinMateria.length > 0 || archivosSinMateria.length > 0) && (
            <section>
              <h3 style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 400, fontSize: "20px", color: "var(--color-text)", marginBottom: "16px" }}>
                Sin asignar a una materia
              </h3>
              {fichasSinMateria.length > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <span style={{ fontSize: "12px", color: "var(--color-text-faint)", fontFamily: "var(--font-ibm-plex-mono)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Fichas</span>
                  <div style={{ marginTop: "8px" }}>{renderFichas(fichasSinMateria)}</div>
                </div>
              )}
              {archivosSinMateria.length > 0 && (
                <div>
                  <span style={{ fontSize: "12px", color: "var(--color-text-faint)", fontFamily: "var(--font-ibm-plex-mono)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Material y cuestionarios</span>
                  <div style={{ marginTop: "8px" }}>{renderArchivos(archivosSinMateria)}</div>
                </div>
              )}
            </section>
          )}
        </div>
      )}

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

      {/* Confirm modal */}
      {confirmState && (
        <div style={MODAL_STYLE} onClick={(e) => { if (e.target === e.currentTarget) setConfirmState(null); }}>
          <div style={{ ...MODAL_BOX, maxWidth: "420px", textAlign: "center" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", border: "1px solid var(--color-stamp)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Trash2 style={{ width: "20px", height: "20px", color: "var(--color-stamp)" }} />
            </div>
            <p style={{ fontFamily: "var(--font-fraunces)", fontWeight: 500, fontSize: "18px", color: "var(--color-text)", marginBottom: "8px" }}>
              Confirmar borrado
            </p>
            <p style={{ fontFamily: "var(--font-inter)", fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "28px", lineHeight: 1.5 }}>
              {confirmState.message}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setConfirmState(null)}
                style={{ background: "none", border: "1px solid var(--color-line)", color: "var(--color-text-muted)", padding: "10px 24px", cursor: "pointer", fontFamily: "var(--font-inter)", fontSize: "13px" }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmState.onConfirm}
                style={{ background: "var(--color-stamp)", color: "#fff", border: "none", padding: "10px 24px", cursor: "pointer", fontFamily: "var(--font-inter)", fontSize: "13px", fontWeight: 500 }}
              >
                Borrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
