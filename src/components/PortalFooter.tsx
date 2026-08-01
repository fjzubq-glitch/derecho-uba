"use client";

import React from "react";
import Link from "next/link";

export default function PortalFooter() {
  return (
    <footer className="border-t" style={{ borderColor: "var(--color-line-soft)" }}>
      <div
        className="footer-inner flex items-center justify-between gap-2 pad-lateral"
        style={{
          padding: "28px 48px",
          fontFamily: "var(--font-ibm-plex-mono)",
          fontSize: "10px",
          letterSpacing: "0.08em",
          color: "var(--color-text-faint)",
          textTransform: "uppercase",
        }}
      >
        <span>Derecho UBA — Material de cursada organizado por materia</span>
        <span className="flex items-center gap-3">
          <span>© 2026 — Designed & developed by <span style={{ color: "var(--color-gold)" }}>Franklin</span></span>
          <Link
            href="/admin"
            title="Administración"
            style={{
              color: "var(--color-text-faint)",
              textDecoration: "none",
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-gold)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-faint)")}
          >
            Admin
          </Link>
        </span>
      </div>
    </footer>
  );
}
