"use client";

import React, { useEffect, useState } from "react";
import { getPortalUserName, setPortalUserName } from "@/lib/portalUser";
import { trackActivity } from "@/lib/tracking";

interface WelcomeGateProps {
  materiaSlug?: string;
}

export default function WelcomeGate({ materiaSlug }: WelcomeGateProps) {
  const [checking, setChecking] = useState(true);
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const name = getPortalUserName();
    if (!name) setOpen(true);
    setChecking(false);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const limpio = nombre.trim();
    if (limpio.length < 2) {
      setError("Escribí tu nombre para continuar");
      return;
    }
    setPortalUserName(limpio);
    trackActivity({ tipo: "usuario_registrado", pagina: "materia", materia_slug: materiaSlug });
    if (materiaSlug) {
      trackActivity({ tipo: "page_view", pagina: "materia", materia_slug: materiaSlug });
    }
    setOpen(false);
  }

  if (checking || !open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center pad-lateral"
      style={{
        background: "rgba(12, 11, 9, 0.88)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div
        className="w-full card-reveal"
        style={{
          maxWidth: "440px",
          background: "var(--color-ink-2)",
          border: "1px solid var(--color-gold-dim)",
          padding: "40px 36px",
        }}
      >
        <div
          className="flex items-center gap-3 mb-6"
          style={{
            fontFamily: "var(--font-ibm-plex-mono)",
            fontSize: "11px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--color-gold)",
          }}
        >
          <span style={{ width: "24px", height: "1px", background: "var(--color-gold-dim)" }} />
          Bienvenida
        </div>

        <h2
          id="welcome-title"
          style={{
            fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
            fontWeight: 400,
            fontSize: "30px",
            lineHeight: 1.2,
            color: "var(--color-text)",
            marginBottom: "12px",
          }}
        >
          Bienvenido/a.
          <br />
          ¿Cómo te llamás?
        </h2>

        <p
          style={{
            fontSize: "14px",
            lineHeight: 1.7,
            color: "var(--color-text-muted)",
            marginBottom: "24px",
          }}
        >
          Así podrás tener una experiencia más personal en cada visita.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              setError(null);
            }}
            placeholder="Tu nombre"
            aria-label="Tu nombre"
            autoFocus
            maxLength={40}
            style={{
              width: "100%",
              background: "var(--color-ink)",
              border: "1px solid var(--color-line)",
              color: "var(--color-text)",
              padding: "12px 14px",
              fontSize: "15px",
              outline: "none",
              fontFamily: "var(--font-inter)",
            }}
          />
          {error && (
            <p
              role="alert"
              style={{
                marginTop: "8px",
                fontSize: "12px",
                fontFamily: "var(--font-ibm-plex-mono)",
                color: "#ff6b6b",
              }}
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            style={{
              width: "100%",
              marginTop: "16px",
              background: "var(--color-gold)",
              color: "var(--color-ink)",
              padding: "12px 20px",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-inter)",
              fontSize: "14px",
              fontWeight: 600,
              transition: "background 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-gold-dim)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-gold)")}
          >
            Entrar al portal
          </button>
        </form>
      </div>
    </div>
  );
}