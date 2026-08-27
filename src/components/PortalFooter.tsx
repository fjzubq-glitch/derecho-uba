"use client";

import React from "react";
import { usePathname } from "next/navigation";

export default function PortalFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/visor")) return null;

  return (
    <footer className="border-t mt-auto" style={{ borderColor: "var(--color-line-soft)" }}>
      <div
        className="footer-inner flex items-center justify-end gap-2 pad-lateral"
        style={{
          padding: "28px 48px",
          fontFamily: "var(--font-special-elite), 'Courier New', monospace",
          fontSize: "13px",
          letterSpacing: "0.01em",
          color: "var(--color-text-faint)",
        }}
      >
        <span className="footer-text">© 2026 — Designed & developed by <span style={{ color: "var(--color-gold)" }}>Franklin Zaldaña</span></span>
      </div>
    </footer>
  );
}
