"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export default function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const clamp = (s: number) => Math.min(6, Math.max(1, s));

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.002;
    setScale((s) => {
      const next = clamp(s + delta);
      if (next === 1) setPos({ x: 0, y: 0 });
      return next;
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setPos((p) => ({ x: p.x + dx, y: p.y + dy }));
  };
  const stopDrag = () => {
    dragging.current = false;
  };

  const zoomBy = (factor: number) => {
    setScale((s) => {
      const next = clamp(s * factor);
      if (next === 1) setPos({ x: 0, y: 0 });
      return next;
    });
  };

  const toggleZoom = () => {
    if (scale > 1) {
      setScale(1);
      setPos({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  };

  const reset = () => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  };

  const btn: React.CSSProperties = {
    background: "rgba(0,0,0,0.55)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: "6px",
    width: "40px",
    height: "40px",
    fontSize: "18px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-inter)",
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      onDoubleClick={toggleZoom}
      style={{
        position: "relative",
        height: "100%",
        width: "100%",
        background: "#ffffff",
        overflow: "hidden",
        cursor: scale > 1 ? (dragging.current ? "grabbing" : "grab") : "zoom-in",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          display: "block",
          transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
          transformOrigin: "center center",
          transition: dragging.current ? "none" : "transform 0.12s ease-out",
          userSelect: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "16px",
          right: "16px",
          display: "flex",
          gap: "8px",
          zIndex: 5,
        }}
      >
        <button style={btn} onClick={() => zoomBy(1.3)} title="Acercar" aria-label="Acercar">
          +
        </button>
        <button style={btn} onClick={() => zoomBy(1 / 1.3)} title="Alejar" aria-label="Alejar">
          −
        </button>
        <button style={btn} onClick={reset} title="Restablecer" aria-label="Restablecer">
          ⟲
        </button>
      </div>
      <div
        style={{
          position: "absolute",
          top: "16px",
          left: "16px",
          color: "rgba(0,0,0,0.55)",
          fontFamily: "var(--font-ibm-plex-mono)",
          fontSize: "11px",
          letterSpacing: "0.05em",
          background: "rgba(255,255,255,0.7)",
          padding: "4px 8px",
          borderRadius: "4px",
          zIndex: 5,
          pointerEvents: "none",
        }}
      >
        doble clic o rueda para zoom · arrastrar para mover
      </div>
    </div>
  );
}
