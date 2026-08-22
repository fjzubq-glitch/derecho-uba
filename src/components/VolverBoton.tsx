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
        background: "none",
        border: "none",
        cursor: "pointer",
        textDecoration: "none",
        fontFamily: "var(--font-ibm-plex-mono)",
        fontSize: "11px",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "var(--color-gold)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
    >
      <ArrowLeft style={{ width: "16px", height: "16px" }} />
      Volver a la clase
    </button>
  );
}
