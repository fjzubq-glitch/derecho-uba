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
    background: "rgba(0,0,0,0.45)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "5px",
    width: "28px",
    height: "28px",
    fontSize: "14px",
    lineHeight: "1",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-inter)",
    padding: 0,
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
          bottom: "10px",
          right: "10px",
          display: "flex",
          gap: "6px",
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
    </div>
  );
}
