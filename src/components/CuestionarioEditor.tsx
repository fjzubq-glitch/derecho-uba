"use client";

import React, { useState } from "react";
import { Loader2, Check, Plus, Trash2 } from "@/components/icons";
import type { CuestionarioData, CuestionarioQuestion, MaterialSection, MaterialBadge } from "@/lib/cuestionario";

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-ibm-plex-mono)",
  fontSize: "10px",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--color-text-faint)",
  marginBottom: "6px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--color-ink)",
  border: "1px solid var(--color-line-soft)",
  borderRadius: 0,
  padding: "10px 12px",
  fontSize: "14px",
  color: "var(--color-text)",
  outline: "none",
  fontFamily: "var(--font-inter)",
};

const blankQuestion = (): CuestionarioQuestion => ({
  id: "p" + Math.random().toString(36).slice(2, 6),
  topic: "",
  priority: "alto",
  enunciado: "",
  pista: "",
  respuestaLibre: "",
  opciones: ["", ""],
  correcta: 0,
  explicacion: "",
  errorTipico: "",
  contexto: "",
});

const blankMaterial = (): MaterialSection => ({
  id: "mat" + Math.random().toString(36).slice(2, 6),
  title: "",
  badges: [],
  enunciado: "",
  contexto: "",
  respuesta: "",
  errorTipico: "",
  contrafactual: "",
  linkRel: "",
});

function parseBadges(text: string): MaterialBadge[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [t, k] = l.split("|");
      const kind = (["fuente", "pareto", "trampa", "cae", "info"] as const).includes(k as never) ? (k as MaterialBadge["kind"]) : "info";
      return { text: (t || k || "").trim(), kind };
    });
}

function badgesToText(badges: MaterialBadge[] = []): string {
  return badges.map((b) => (b.kind && b.kind !== "info" ? `${b.kind}|${b.text}` : b.text)).join("\n");
}

function parseTable(text: string): { headers: string[]; rows: string[][] } | undefined {
  try {
    const p = JSON.parse(text);
    if (p && Array.isArray(p.headers) && Array.isArray(p.rows)) return p;
  } catch {
    return undefined;
  }
  return undefined;
}

function stringifyTable(table?: { headers: string[]; rows: string[][] }): string {
  return table ? JSON.stringify(table) : "";
}

export default function CuestionarioEditor({
  contenido,
  onSave,
  onCancel,
  saving,
}: {
  contenido: CuestionarioData;
  onSave: (c: CuestionarioData) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [data, setData] = useState<CuestionarioData>(() => JSON.parse(JSON.stringify(contenido)));

  const setHeader = (k: keyof CuestionarioData["header"], v: string) =>
    setData((d) => ({ ...d, header: { ...d.header, [k]: v } }));

  const setQ = (i: number, patch: Partial<CuestionarioQuestion>) =>
    setData((d) => ({ ...d, questions: d.questions.map((q, k) => (k === i ? { ...q, ...patch } : q)) }));

  const setM = (i: number, patch: Partial<MaterialSection>) =>
    setData((d) => ({ ...d, material: d.material.map((m, k) => (k === i ? { ...m, ...patch } : m)) }));

  const parseOpciones = (text: string): string[] => text.split("\n").map((l) => l.trim()).filter(Boolean);

  const Card = ({ index, children, onRemove }: { index: string; children: React.ReactNode; onRemove?: () => void }) => (
    <div style={{ background: "var(--color-ink)", border: "1px solid var(--color-line-soft)", borderRadius: 0, padding: "18px" }}>
      <div className="flex items-center justify-between" style={{ marginBottom: "14px" }}>
        <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "11px", letterSpacing: "0.1em", color: "var(--color-gold)", textTransform: "uppercase" }}>{index}</span>
        {onRemove && (
          <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: "#E05555" }} title="Quitar">
            <Trash2 style={{ width: "15px", height: "15px" }} />
          </button>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );

  const field = (label: string, node: React.ReactNode) => (
    <div>
      <label style={labelStyle}>{label}</label>
      {node}
    </div>
  );

  return (
    <div className="space-y-5" style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: "4px" }}>
      {/* Header */}
      <Card index="Cabecera">
        {field("Titulo", <input style={inputStyle} value={data.header.title} onChange={(e) => setHeader("title", e.target.value)} placeholder="Ej: Contratos · Clase 1" />)}
        {field("Subtitulo", <input style={inputStyle} value={data.header.sub} onChange={(e) => setHeader("sub", e.target.value)} placeholder="Ej: CCC — Unidad 1" />)}
        {field("Meta (conteo)", <input style={inputStyle} value={data.header.meta} onChange={(e) => setHeader("meta", e.target.value)} placeholder="Ej: 14 ítems · 3 casos" />)}
        {field("Clave de progreso (storageKey)", <input style={inputStyle} value={data.storageKey || ""} onChange={(e) => setData((d) => ({ ...d, storageKey: e.target.value }))} placeholder="ej: contratos_clase1_progress" />)}
      </Card>

      {/* Questions */}
      {data.questions.map((q, i) => (
        <Card key={q.id || i} index={`Pregunta ${i + 1}`} onRemove={data.questions.length > 1 ? () => setData((d) => ({ ...d, questions: d.questions.filter((_, k) => k !== i) })) : undefined}>
          <div className="grid grid-cols-2 gap-3">
            {field("ID", <input style={inputStyle} value={q.id} onChange={(e) => setQ(i, { id: e.target.value })} />)}
            {field("Topic / fuente", <input style={inputStyle} value={q.topic} onChange={(e) => setQ(i, { topic: e.target.value })} placeholder="O1 · art. 1092 CCC" />)}
          </div>
          {field(
            "Prioridad",
            <select style={inputStyle} value={q.priority} onChange={(e) => setQ(i, { priority: e.target.value as CuestionarioQuestion["priority"] })}>
              <option value="critico">Crítico</option>
              <option value="alto">Alto</option>
              <option value="medio">Medio</option>
            </select>
          )}
          {field("Enunciado", <textarea style={{ ...inputStyle, minHeight: "56px" }} value={q.enunciado} onChange={(e) => setQ(i, { enunciado: e.target.value })} />)}
          {field("Pista", <textarea style={{ ...inputStyle, minHeight: "40px" }} value={q.pista || ""} onChange={(e) => setQ(i, { pista: e.target.value })} placeholder="(opcional)" />)}
          {field("Respuesta libre", <textarea style={{ ...inputStyle, minHeight: "40px" }} value={q.respuestaLibre || ""} onChange={(e) => setQ(i, { respuestaLibre: e.target.value })} placeholder="(opcional)" />)}
          {field(
            "Opciones (una por línea)",
            <textarea
              style={{ ...inputStyle, minHeight: "72px", fontFamily: "var(--font-ibm-plex-mono)", fontSize: "12px" }}
              value={q.opciones.join("\n")}
              onChange={(e) => setQ(i, { opciones: parseOpciones(e.target.value) })}
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            {field(
              "Índice de la correcta (0 = primera)",
              <input style={inputStyle} type="number" min={0} value={q.correcta} onChange={(e) => setQ(i, { correcta: Number(e.target.value) || 0 })} />
            )}
            {field("# opciones", <div style={{ ...inputStyle, display: "flex", alignItems: "center", color: "var(--color-text-muted)" }}>{q.opciones.length}</div>)}
          </div>
          {field("Explicación", <textarea style={{ ...inputStyle, minHeight: "56px" }} value={q.explicacion} onChange={(e) => setQ(i, { explicacion: e.target.value })} />)}
          {field("Error típico", <textarea style={{ ...inputStyle, minHeight: "40px" }} value={q.errorTipico || ""} onChange={(e) => setQ(i, { errorTipico: e.target.value })} />)}
          {field("Contexto (opcional)", <textarea style={{ ...inputStyle, minHeight: "40px" }} value={q.contexto || ""} onChange={(e) => setQ(i, { contexto: e.target.value })} />)}
        </Card>
      ))}

      <button
        onClick={() => setData((d) => ({ ...d, questions: [...d.questions, blankQuestion()] }))}
        style={{ background: "none", border: "1px solid var(--color-line)", color: "var(--color-gold)", padding: "10px 16px", cursor: "pointer", fontFamily: "var(--font-ibm-plex-mono)", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "8px" }}
      >
        <Plus style={{ width: "14px", height: "14px" }} /> Agregar pregunta
      </button>

      {/* Material */}
      {data.material.map((m, i) => (
        <Card key={m.id || i} index={`Sección ${i + 1} (material)`} onRemove={() => setData((d) => ({ ...d, material: d.material.filter((_, k) => k !== i) }))}>
          {field("Título", <input style={inputStyle} value={m.title} onChange={(e) => setM(i, { title: e.target.value })} />)}
          {field("Badges (una por línea: texto | tipo)", <textarea style={{ ...inputStyle, minHeight: "40px" }} value={badgesToText(m.badges)} onChange={(e) => setM(i, { badges: parseBadges(e.target.value) })} />)}
          {field("Enunciado", <textarea style={{ ...inputStyle, minHeight: "40px" }} value={m.enunciado || ""} onChange={(e) => setM(i, { enunciado: e.target.value })} />)}
          {field("Contexto / caso", <textarea style={{ ...inputStyle, minHeight: "48px" }} value={m.contexto || ""} onChange={(e) => setM(i, { contexto: e.target.value })} />)}
          {field("Respuesta / resolución", <textarea style={{ ...inputStyle, minHeight: "72px" }} value={m.respuesta || ""} onChange={(e) => setM(i, { respuesta: e.target.value })} />)}
          {field("Error típico", <textarea style={{ ...inputStyle, minHeight: "40px" }} value={m.errorTipico || ""} onChange={(e) => setM(i, { errorTipico: e.target.value })} />)}
          {field("Contrafáctico (opcional)", <textarea style={{ ...inputStyle, minHeight: "40px" }} value={m.contrafactual || ""} onChange={(e) => setM(i, { contrafactual: e.target.value })} />)}
          {field("Link relacionado (opcional)", <input style={inputStyle} value={m.linkRel || ""} onChange={(e) => setM(i, { linkRel: e.target.value })} />)}
          {field("Tabla JSON (opcional)", <textarea style={{ ...inputStyle, minHeight: "48px" }} value={stringifyTable(m.table)} onChange={(e) => setM(i, { table: parseTable(e.target.value) })} placeholder='{"headers":["A","B"],"rows":[["a","b"]]}' />)}
        </Card>
      ))}

      <button
        onClick={() => setData((d) => ({ ...d, material: [...d.material, blankMaterial()] }))}
        style={{ background: "none", border: "1px solid var(--color-line)", color: "var(--color-gold)", padding: "10px 16px", cursor: "pointer", fontFamily: "var(--font-ibm-plex-mono)", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "8px" }}
      >
        <Plus style={{ width: "14px", height: "14px" }} /> Agregar sección de material
      </button>

      <div className="flex justify-end gap-3" style={{ position: "sticky", bottom: 0, background: "var(--color-card)", padding: "12px 0", borderTop: "1px solid var(--color-line-soft)" }}>
        <button onClick={onCancel} style={{ background: "none", border: "1px solid var(--color-line)", color: "var(--color-text-muted)", padding: "10px 20px", cursor: "pointer", fontFamily: "var(--font-inter)" }}>Cancelar</button>
        <button
          onClick={() => onSave(data)}
          disabled={saving}
          style={{ background: "var(--color-gold)", color: "var(--color-ink)", border: "none", padding: "10px 20px", cursor: saving ? "not-allowed" : "pointer", fontFamily: "var(--font-inter)", display: "flex", alignItems: "center", gap: "8px", opacity: saving ? 0.6 : 1 }}
        >
          {saving ? <Loader2 style={{ width: "14px", height: "14px", animation: "spin 1s linear infinite" }} /> : <Check style={{ width: "14px", height: "14px" }} />}
          Guardar
        </button>
      </div>
    </div>
  );
}
