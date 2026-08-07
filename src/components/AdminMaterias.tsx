"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Edit3, Check, X, Loader2, BookOpen } from "@/components/icons";

interface Materia {
  id: string;
  nombre: string;
  slug: string;
  comision: string | null;
  catedra: string | null;
  anio: string | null;
  turno: string | null;
  descripcion: string | null;
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

export default function AdminMaterias() {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Materia | null>(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadMaterias();
  }, []);

  async function loadMaterias() {
    setLoading(true);
    const { data } = await supabase.from("materias").select("*").order("nombre");
    if (data) setMaterias(data as Materia[]);
    setLoading(false);
  }

  async function handleSave() {
    if (!editing) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/admin/materias", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          data: {
            nombre: editing.nombre,
            comision: editing.comision || "",
            catedra: editing.catedra || "",
            anio: editing.anio || "",
            turno: editing.turno || "",
            descripcion: editing.descripcion || "",
          },
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage("Materia guardada correctamente");
        setEditing(null);
        loadMaterias();
      } else {
        setMessage("Error: " + data.error);
      }
    } catch (err) {
      setMessage("Error: " + String(err));
    } finally {
      setProcessing(false);
    }
  }

  const set = (key: keyof Materia) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!editing) return;
    setEditing({ ...editing, [key]: e.target.value });
  };

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

  return (
    <div className="space-y-4">
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

      {loading ? (
        <div className="flex items-center justify-center" style={{ padding: "60px 0" }}>
          <div
            className="animate-spin"
            style={{
              width: "32px",
              height: "32px",
              border: "2px solid var(--color-line)",
              borderTopColor: "var(--color-gold)",
              borderRadius: "50%",
            }}
          />
        </div>
      ) : (
        <div className="overflow-hidden" style={{ background: "var(--color-line-soft)", gap: "1px", borderRadius: 0 }}>
          {materias.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-4"
              style={{ background: "var(--color-card)", padding: "22px 26px" }}
            >
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  border: "1px solid var(--color-gold-dim)",
                }}
              >
                <BookOpen style={{ width: "16px", height: "16px", color: "var(--color-gold)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  style={{
                    fontSize: "15px",
                    fontWeight: 500,
                    color: "var(--color-text)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {m.nombre}
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-ibm-plex-mono)",
                    fontSize: "10px",
                    color: "var(--color-text-faint)",
                    marginTop: "3px",
                  }}
                >
                  {[m.comision && `Comisión ${m.comision}`, m.catedra, m.anio && `Año ${m.anio}`, m.turno].filter(Boolean).join(" · ") || "Sin datos extra"}
                </p>
              </div>
              <button
                onClick={() => setEditing({ ...m, descripcion: m.descripcion || "" })}
                className="flex items-center gap-1.5"
                style={{
                  background: "none",
                  border: "1px solid transparent",
                  cursor: "pointer",
                  padding: "8px 10px",
                  fontSize: "12px",
                  fontWeight: 500,
                  fontFamily: "var(--font-inter)",
                  color: "var(--color-text-muted)",
                  flexShrink: 0,
                  transition: "color 0.2s ease, border-color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--color-gold)";
                  e.currentTarget.style.borderColor = "var(--color-gold-dim)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--color-text-muted)";
                  e.currentTarget.style.borderColor = "transparent";
                }}
              >
                <Edit3 style={{ width: "13px", height: "13px" }} />
                Editar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div style={modalBackdrop}>
          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              background: "var(--color-card)",
              border: "1px solid var(--color-line-soft)",
              borderRadius: 0,
              padding: "28px",
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3
                style={{
                  fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                  fontWeight: 500,
                  fontSize: "18px",
                  color: "var(--color-text)",
                }}
              >
                Editar materia
              </h3>
              <button
                onClick={() => setEditing(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)" }}
              >
                <X style={{ width: "18px", height: "18px" }} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label style={labelStyle}>Nombre</label>
                <input type="text" value={editing.nombre} onChange={set("nombre")} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Comisión</label>
                <input type="text" value={editing.comision || ""} onChange={set("comision")} placeholder="Ej: 202" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Cátedra / Profesor</label>
                <input type="text" value={editing.catedra || ""} onChange={set("catedra")} placeholder="Ej: Cátedra Gargarella" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Año que se cursa</label>
                <input type="text" value={editing.anio || ""} onChange={set("anio")} placeholder="Ej: 2do" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Turno</label>
                <input type="text" value={editing.turno || ""} onChange={set("turno")} placeholder="Ej: Mañana" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Descripción</label>
                <textarea
                  value={editing.descripcion || ""}
                  onChange={set("descripcion")}
                  rows={3}
                  placeholder="Notas o detalle de la materia..."
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "var(--font-inter)" }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditing(null)}
                style={{
                  padding: "10px 20px",
                  fontSize: "11px",
                  fontWeight: 500,
                  fontFamily: "var(--font-inter)",
                  background: "transparent",
                  border: "1px solid var(--color-line)",
                  borderRadius: 0,
                  color: "var(--color-text-muted)",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={processing}
                style={{
                  padding: "10px 20px",
                  fontSize: "11px",
                  fontWeight: 500,
                  fontFamily: "var(--font-inter)",
                  background: "var(--color-gold)",
                  color: "var(--color-ink)",
                  border: "none",
                  borderRadius: 0,
                  cursor: processing ? "not-allowed" : "pointer",
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
    </div>
  );
}