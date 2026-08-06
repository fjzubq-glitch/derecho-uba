"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, BookOpen, X } from "@/components/icons";
import { clearAdminSession } from "@/lib/utils";
import { getPortalUserName, PORTAL_USER_EVENT } from "@/lib/portalUser";

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
  const router = useRouter();
  const [adminActive, setAdminActive] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    setUserName(getPortalUserName());
    const onUserChange = () => setUserName(getPortalUserName());
    window.addEventListener(PORTAL_USER_EVENT, onUserChange);
    return () => window.removeEventListener(PORTAL_USER_EVENT, onUserChange);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/session");
        const data = await res.json();
        setAdminActive(data.ok === true);
      } catch {
        setAdminActive(false);
      }
    })();
  }, []);

  function handleGoAdmin() {
    router.push("/admin");
  }

  function handleLogoutAdmin() {
    clearAdminSession();
    setAdminActive(false);
    fetch("/api/admin/session", { method: "DELETE" })
      .catch(() => {})
      .finally(() => window.location.reload());
  }

  return (
    <header
      className="site-header border-b"
      style={{
        borderColor: "var(--color-line-soft)",
      }}
    >
      <div
        className="flex items-center justify-between gap-2 sm:gap-4 pad-lateral"
        style={{ padding: "16px 22px" }}
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
              className="text-[17px] sm:text-[20px]"
              style={{
                fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                fontWeight: 500,
                lineHeight: 1.2,
                color: "var(--color-text)",
                whiteSpace: "nowrap",
              }}
            >
              Derecho <span style={{ color: "var(--color-gold)" }}>UBA</span>
            </div>
            <div
              className="hidden sm:block"
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

        {/* Derecha: saludo, nav contextual, CTA única, admin badge o Planificador */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          {userName && (
            <div
              className="flex items-center gap-2 max-w-[140px] sm:max-w-[200px] min-w-0"
              title={`Sesión de ${userName}`}
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "11px",
                letterSpacing: "0.04em",
                color: "var(--color-gold)",
              }}
            >
              <span className="truncate">
                Hola {userName}
              </span>
            </div>
          )}

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

          {adminActive && (
            <div className="flex items-center" style={{ gap: "4px" }}>
              <button
                onClick={handleGoAdmin}
                className="flex items-center gap-1.5"
                title="Ir al panel de administración"
                style={{
                  background: "rgba(185, 154, 98, 0.12)",
                  border: "1px solid var(--color-gold-dim)",
                  color: "var(--color-gold)",
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontFamily: "var(--font-ibm-plex-mono)",
                  fontSize: "10px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  lineHeight: 1,
                  transition: "background 0.2s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(185, 154, 98, 0.22)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(185, 154, 98, 0.12)")}
              >
                <Shield style={{ width: "11px", height: "11px" }} />
                <span className="hidden sm:inline">Admin</span>
              </button>
              <button
                onClick={handleLogoutAdmin}
                title="Cerrar sesión de administrador"
                className="flex items-center justify-center"
                style={{
                  background: "none",
                  border: "1px solid var(--color-gold-dim)",
                  color: "var(--color-gold)",
                  width: "28px",
                  height: "28px",
                  cursor: "pointer",
                  padding: 0,
                  transition: "background 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(185, 154, 98, 0.22)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                <X style={{ width: "10px", height: "10px", opacity: 0.6 }} />
              </button>
            </div>
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
            <span className="hidden sm:inline">Planificador</span>
          </a>
        </div>
      </div>
    </header>
  );
}
