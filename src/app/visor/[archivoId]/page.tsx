import VolverBoton from "@/components/VolverBoton";
import { cookies } from "next/headers";
import { isAdminRequest, verifyVisorToken } from "@/lib/auth";
import ZoomableImage from "@/components/ZoomableImage";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getObjectStream } from "@/lib/r2";

export const dynamic = "force-dynamic";

export default async function VisorPage({
  params,
  searchParams,
}: {
  params: Promise<{ archivoId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { archivoId } = await params;
  const sp = await searchParams;
  const token = typeof sp.t === "string" ? sp.t : null;
  const cookieHeader = (await cookies()).toString();
  const esAdmin = verifyVisorToken(token, archivoId) || isAdminRequest(cookieHeader);

  const { data: archivo } = await getSupabaseAdmin()
    .from("archivos")
    .select("storage_key, youtube_url, cloudinary_url, tipo, contenido_texto, nombre_display")
    .eq("id", archivoId)
    .single();

  // Sin allow-same-origin: el contenido del iframe queda en un origen opaco y
  // no puede leer cookies, localStorage ni acceder al padre (mitiga XSS/session
  // theft si el contenido embebido resultara comprometido).
  const iframeSandbox = "allow-scripts allow-forms allow-popups allow-modals";
  const isImage = (key: string | null) =>
    !!key && /\.(jpe?g|png|gif|webp|svg|bmp|avif|jfif|heic|heif|tiff?|ico)$/i.test(key);

  type Modo = "srcdoc" | "iframe" | "imagen" | "externo" | "error";
  let modo: Modo = "error";
  let iframeSrc: string | null = null;
  let iframeSrcDoc: string | null = null;
  let externalUrl: string | null = null;
  let errorMsg: string | null = null;

  if (archivo) {
    if (archivo.tipo === "cuestionario") {
      // Solo el administrador puede ver el cuestionario. Se resuelve en el
      // servidor (que sí lee la cookie) y se embebe con srcDoc, evitando
      // dependencias de que la cookie viaje en la subpetición del iframe.
      if (!esAdmin) {
        errorMsg = "No autorizado";
      } else if (archivo.storage_key) {
        try {
          const r2Res = await getObjectStream(archivo.storage_key);
          if (!r2Res.ok) {
            errorMsg = `R2: ${r2Res.status}`;
          } else {
            iframeSrcDoc = await r2Res.text();
            modo = "srcdoc";
          }
        } catch (e) {
          errorMsg = e instanceof Error ? e.message : "Error al leer el archivo";
        }
      } else if (archivo.contenido_texto) {
        iframeSrcDoc = archivo.contenido_texto;
        modo = "srcdoc";
      } else {
        errorMsg = "Cuestionario sin contenido";
      }
    } else {
      if ((archivo.tipo === "material_privado" || archivo.tipo === "ficha") && !esAdmin) {
        errorMsg = "No autorizado";
      } else {
      const youtubeUrl = archivo.youtube_url || archivo.cloudinary_url;
      if (youtubeUrl) {
        const ytMatch = youtubeUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
        if (ytMatch) {
          iframeSrc = `https://www.youtube.com/embed/${ytMatch[1]}`;
          modo = "iframe";
        } else if (/cloudinary\.com/.test(youtubeUrl)) {
          iframeSrc = youtubeUrl;
          modo = "iframe";
        } else {
          externalUrl = youtubeUrl;
          modo = "externo";
        }
      } else if (archivo.storage_key && /\.(html?|htm)$/i.test(archivo.storage_key)) {
        try {
          const r2Res = await getObjectStream(archivo.storage_key);
          if (!r2Res.ok) {
            errorMsg = `R2: ${r2Res.status}`;
          } else {
            iframeSrcDoc = await r2Res.text();
            modo = "srcdoc";
          }
        } catch (e) {
          errorMsg = e instanceof Error ? e.message : "Error al leer el archivo";
        }
      } else if (archivo.contenido_texto) {
        iframeSrcDoc = archivo.contenido_texto;
        modo = "srcdoc";
      } else if (archivo.storage_key) {
        if (isImage(archivo.storage_key)) {
          iframeSrc = `/api/stream/${archivoId}`;
          modo = "imagen";
        } else {
          iframeSrc = `/api/stream/${archivoId}`;
          modo = "iframe";
        }
      } else {
        errorMsg = "Archivo sin contenido";
      }
      }
    }
  } else {
    errorMsg = "Archivo no encontrado";
  }

  const ocultarHeader = archivo?.tipo === "material_privado";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        background: ocultarHeader ? "#ffffff" : "var(--color-ink)",
        overflow: "hidden",
      }}
    >
      {!ocultarHeader && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "8px 16px",
            borderBottom: "1px solid var(--color-gold-dim)",
            flexShrink: 0,
            background: "var(--color-card)",
          }}
        >
          <VolverBoton />
        </div>
      )}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          background: "#ffffff",
        }}
      >
        {errorMsg ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--color-text-faint)",
              fontFamily: "var(--font-ibm-plex-mono)",
              fontSize: "14px",
            }}
          >
            {errorMsg}
          </div>
        ) : modo === "imagen" && iframeSrc ? (
          <ZoomableImage src={iframeSrc} alt={archivo?.nombre_display || "Material privado"} />
        ) : modo === "externo" && externalUrl ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              height: "100%",
              color: "var(--color-text-faint)",
              fontFamily: "var(--font-ibm-plex-mono)",
              fontSize: "14px",
              background: "#ffffff",
              padding: "24px",
              textAlign: "center",
            }}
          >
            <p>Este enlace no se puede mostrar dentro del visor.</p>
            <button
              onClick={() => window.open(externalUrl, "_blank")}
              style={{
                background: "var(--color-gold)",
                color: "var(--color-ink)",
                border: "none",
                borderRadius: 0,
                padding: "12px 24px",
                fontSize: "14px",
                fontWeight: 600,
                fontFamily: "var(--font-inter)",
                cursor: "pointer",
              }}
            >
              Abrir enlace en una pestaña nueva
            </button>
          </div>
        ) : iframeSrcDoc !== null ? (
          <iframe
            title="Web interactiva"
            sandbox={iframeSandbox}
            srcDoc={iframeSrcDoc}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              display: "block",
              background: "#ffffff",
            }}
          />
        ) : iframeSrc ? (
          <iframe
            src={iframeSrc}
            title="Web interactiva"
            sandbox={iframeSandbox}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              display: "block",
              background: "#ffffff",
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
