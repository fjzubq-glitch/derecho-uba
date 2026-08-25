"use client";

import React, { useState } from "react";
import { Loader2, Check } from "@/components/icons";

const textareaStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--color-ink)",
  border: "1px solid var(--color-line-soft)",
  borderRadius: 0,
  padding: "14px 16px",
  fontSize: "12px",
  lineHeight: 1.6,
  color: "var(--color-text)",
  outline: "none",
  fontFamily: "var(--font-ibm-plex-mono), ui-monospace, monospace",
  resize: "vertical",
};

export default function HtmlEditor({
  html,
  onSave,
  onCancel,
  saving,
}: {
  html: string;
  onSave: (h: string) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [value, setValue] = useState(html);

  const volver = () => {
    setValue(html);
    onCancel();
  };

  return (
    <div className="space-y-4" style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: "4px" }}>
      <p
        style={{
          fontSize: "12px",
          fontFamily: "var(--font-ibm-plex-mono)",
          color: "var(--color-text-muted)",
          lineHeight: 1.5,
        }}
      >
        Editá el HTML tal cual. No se regenera ni cambia su estructura: tocá solo lo que
        necesitás corregir (un texto, un dato, un color). Adaptable a cambios simples.
      </p>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        spellCheck={false}
        aria-label="Código HTML del cuestionario"
        style={{ ...textareaStyle, minHeight: "420px" }}
      />
      <div className="flex justify-end gap-3" style={{ position: "sticky", bottom: 0, background: "var(--color-card)", padding: "12px 0", borderTop: "1px solid var(--color-line-soft)" }}>
        <button onClick={volver} style={{ background: "none", border: "1px solid var(--color-line)", color: "var(--color-text-muted)", padding: "10px 20px", cursor: "pointer", fontFamily: "var(--font-inter)" }}>
          Cancelar
        </button>
        <button
          onClick={() => onSave(value)}
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
