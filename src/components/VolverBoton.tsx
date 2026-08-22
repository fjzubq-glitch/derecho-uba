"use client";

import { ArrowLeft } from "@/components/icons";

export default function VolverBoton() {
  return (
    <button
      type="button"
      onClick={() => window.close()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        background: "var(--color-gold)",
        border: "1px solid var(--color-gold)",
        cursor: "pointer",
        textDecoration: "none",
        fontFamily: "var(--font-ibm-plex-mono)",
        fontSize: "12px",
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--color-ink)",
        padding: "11px 20px",
        boxShadow: "0 0 0 3px rgba(185, 154, 98, 0.25)",
        transition: "background 0.2s ease, box-shadow 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--color-gold-dim)";
        e.currentTarget.style.boxShadow = "0 0 0 5px rgba(185, 154, 98, 0.35)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--color-gold)";
        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(185, 154, 98, 0.25)";
      }}
    >
      <ArrowLeft style={{ width: "16px", height: "16px" }} />
      Volver a la clase
    </button>
  );
}
