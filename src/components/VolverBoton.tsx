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
        gap: "7px",
        background: "transparent",
        border: "1px solid var(--color-gold-dim)",
        cursor: "pointer",
        fontFamily: "var(--font-ibm-plex-mono)",
        fontSize: "11px",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--color-gold)",
        padding: "8px 16px",
        transition: "background 0.2s ease, border-color 0.2s ease, color 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(185, 154, 98, 0.12)";
        e.currentTarget.style.borderColor = "var(--color-gold)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderColor = "var(--color-gold-dim)";
      }}
    >
      <ArrowLeft style={{ width: "15px", height: "15px" }} />
      Volver a la clase
    </button>
  );
}
