"use client";

import React from "react";
import Link from "next/link";
import { Shield } from "@/components/icons";

export default function PortalFooter() {
  return (
    <footer className="border-t" style={{ borderColor: "var(--color-line-soft)" }}>
      <div
        className="footer-inner flex items-center justify-between gap-2 pad-lateral"
        style={{
          padding: "28px 48px",
          fontFamily: "var(--font-special-elite), 'Courier New', monospace",
          fontSize: "10px",
          letterSpacing: "0.08em",
          color: "var(--color-text-faint)",
          textTransform: "uppercase",
        }}
      >
        <span>Derecho UBA — Material de cursada organizado por materia</span>
        <Link
          href="/admin"
          className="flex items-center gap-1.5"
          aria-label="Panel de administración"
          style={{
            color: "var(--color-text-faint)",
            textDecoration: "none",
            transition: "color 0.2s ease",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-gold)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-faint)")}
        >
          <Shield style={{ width: "11px", height: "11px" }} />
          Panel
        </Link>
        <span>© 2026 — Designed & developed by <span style={{ color: "var(--color-gold)" }}>Franklin</span></span>
      </div>
    </footer>
  );
}
