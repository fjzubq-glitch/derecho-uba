"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Props {
  srcDoc: string;
  archivoId: string;
  sandbox: string;
}

export default function IframeEditorBridge({ srcDoc, archivoId, sandbox }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const handleSave = useCallback(
    async (html: string) => {
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/admin/cuestionario/${archivoId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ html }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
      setTimeout(() => setSaveStatus("idle"), 2500);
    },
    [archivoId]
  );

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      // Solo aceptar mensajes del iframe propio (mitiga forgeries desde
      // otras ventanas/pestañas abiertas en el mismo navegador).
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (
        e.data?.type === "cuestionario-editor-save" &&
        typeof e.data.html === "string"
      ) {
        handleSave(e.data.html);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [handleSave]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative" as const,
      }}
    >
      <iframe
        ref={iframeRef}
        title="Cuestionario"
        sandbox={sandbox}
        srcDoc={srcDoc}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block" as const,
        }}
      />
      {saveStatus !== "idle" && (
        <div
          style={{
            position: "absolute" as const,
            bottom: 20,
            right: 20,
            background:
              saveStatus === "saving"
                ? "#e6b87b"
                : saveStatus === "saved"
                  ? "#5fb88a"
                  : "#e07a75",
            color: "#191919",
            padding: "8px 16px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            zIndex: 9999,
            fontFamily: "var(--font-inter, -apple-system, sans-serif)",
            transition: "opacity 0.3s",
          }}
        >
          {saveStatus === "saving" && "Guardando..."}
          {saveStatus === "saved" && "\u2713 Guardado"}
          {saveStatus === "error" && "Error al guardar"}
        </div>
      )}
    </div>
  );
}
