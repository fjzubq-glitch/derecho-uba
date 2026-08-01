"use client";

import React from "react";
import Link from "next/link";
import { Shield, BookOpen } from "@/components/icons";

const PLANIFICADOR_URL = "https://fjzubq-glitch.github.io/Recomendacion-Materias-UBA/index.html";

interface PortalHeaderProps {
  /** Ruta a la que apunta la acción principal "Ver materias". */
  ctaHref?: string;
  /** Navegación contextual opcional (breadcrumb o título) que reemplaza la CTA. */
  nav?: React.ReactNode;
  /** Oculta la CTA de la derecha (ej. cuando la página ya es la de materias). */
  hideCta?: boolean;
}

export default function PortalHeader({ ctaHref = "/dashboard", nav, hideCta = false }: PortalHeaderProps) {
  return (
    <header
      className="border-b"
      style={{
        borderColor: "var(--color-line-soft)",
        background: "linear-gradient(180deg, var(--color-ink-2) 0%, var(--color-ink) 100%)",
      }}
    >
      <div
        className="flex items-center justify-between gap-4 pad-lateral"
        style={{ padding: "20px 48px" }}
      >
        {/* Logo + nombre */}
        <Link href="/" className="flex items-center gap-4 min-w-0" style={{ textDecoration: "none" }}>
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              border: "1px solid var(--color-gold-dim)",
            }}
          >
            <Shield style={{ width: "15px", height: "15px", color: "var(--color-gold)" }} />
          </div>
          <div className="min-w-0">
            <div
              style={{
                fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                fontWeight: 500,
                fontSize: "20px",
                lineHeight: 1.2,
                color: "var(--color-text)",
                whiteSpace: "nowrap",
              }}
            >
              Derecho <span style={{ color: "var(--color-gold)" }}>UBA</span>
            </div>
            <div
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "10px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--color-text-faint)",
                marginTop: "3px",
                whiteSpace: "nowrap",
              }}
            >
              Portal de cursada
            </div>
          </div>
        </Link>

        {/* Derecha: nav contextual, CTA única o Planificador */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {nav ? (
            nav
          ) : hideCta ? null : (
            <Link
              href={ctaHref}
              className="flex items-center gap-2"
              style={{
                background: "var(--color-gold)",
                color: "var(--color-ink)",
                padding: "10px 20px",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-inter)",
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none",
                lineHeight: 1,
                transition: "background 0.2s ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-gold-dim)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-gold)")}
            >
              Ver materias
            </Link>
          )}
          <a
            href={PLANIFICADOR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
            style={{
              background: "none",
              border: "1px solid var(--color-line)",
              color: "var(--color-text-muted)",
              padding: "9px 16px",
              cursor: "pointer",
              fontFamily: "var(--font-ibm-plex-mono)",
              fontSize: "11px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              textDecoration: "none",
              lineHeight: 1,
              transition: "border-color 0.2s ease, color 0.2s ease",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--color-gold)";
              e.currentTarget.style.color = "var(--color-gold)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--color-line)";
              e.currentTarget.style.color = "var(--color-text-muted)";
            }}
          >
            <BookOpen style={{ width: "13px", height: "13px" }} />
            Planificador
          </a>
        </div>
      </div>
    </header>
  );
}
