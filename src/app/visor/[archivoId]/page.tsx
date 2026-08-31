import VolverBoton from "@/components/VolverBoton";
import IframeEditorBridge from "@/components/IframeEditorBridge";
import { cookies } from "next/headers";
import { isAdminRequest, verifyVisorToken } from "@/lib/auth";
import ZoomableImage from "@/components/ZoomableImage";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getObjectStream } from "@/lib/r2";

const BRIDGE_SCRIPT_ADMIN = `<script>(function(){function h(){try{window.parent.postMessage({type:"cuestionario-editor-save",html:"<!DOCTYPE html>\\n"+document.documentElement.outerHTML},"*")}catch(e){}}function hook(){if(typeof EditorManager!=="undefined"&&EditorManager.saveContent){var o=EditorManager.saveContent.bind(EditorManager);EditorManager.saveContent=function(){o();h()}}else setTimeout(hook,200)}hook();document.addEventListener("visibilitychange",function(){if(document.visibilityState==="hidden")h()})})();<` + `/script>`;

const BRIDGE_SCRIPT_READONLY = `<script>(function(){function disable(){var t=document.getElementById("global-editor-toggle"),s=document.getElementById("global-editor-save"),r=document.getElementById("global-editor-reset"),b=document.getElementById("global-editor-toolbar"),i=document.getElementById("edited-indicator");if(t)t.style.display="none";if(s)s.style.display="none";if(r)r.style.display="none";if(b)b.style.display="none";if(i)i.style.display="none";}if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",disable)}else{disable()}})();<` + `/script>`;

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
  const nombreVisitante = typeof sp.nombre === "string" ? sp.nombre.trim() : null;
  const claveVisitante = typeof sp.clave === "string" ? sp.clave.trim().toUpperCase() : null;
  const cookieHeader = (await cookies()).toString();
  const esAdmin = verifyVisorToken(token, archivoId) || isAdminRequest(cookieHeader);

  const { data: archivo } = await getSupabaseAdmin()
    .from("archivos")
    .select("storage_key, youtube_url, cloudinary_url, tipo, contenido_texto, nombre_display, clase_id")
    .eq("id", archivoId)
    .single();

  // Sin allow-same-origin: el contenido del iframe queda en un origen opaco y
  // no puede leer cookies, localStorage ni acceder al padre (mitiga XSS/session
  // theft si el contenido embebido resultara comprometido).
  const iframeSandbox = "allow-scripts allow-forms allow-popups allow-modals";
  const isImage = (key: string | null) =>
    !!key && /\.(jpe?g|png|gif|webp|svg|bmp|avif|jfif|heic|heif|tiff?|ico)$/i.test(key);

  // Check si el visitante tiene acceso especial a la materia del archivo
  let tieneAccesoEspecial = false;
  if (!esAdmin && nombreVisitante && claveVisitante && archivo?.clase_id) {
    const { data: clase } = await getSupabaseAdmin()
      .from("clases")
      .select("materia_id")
      .eq("id", archivo.clase_id)
      .single();
    if (clase) {
      const { data: acceso } = await getSupabaseAdmin()
        .from("accesos_especiales")
        .select("id")
        .eq("materia_id", clase.materia_id)
        .eq("clave", claveVisitante)
        .ilike("nombre", nombreVisitante)
        .maybeSingle();
      tieneAccesoEspecial = !!acceso;
    }
  }

  type Modo = "srcdoc" | "iframe" | "imagen" | "externo" | "error";
  let modo: Modo = "error";
  let iframeSrc: string | null = null;
  let iframeSrcDoc: string | null = null;
  let externalUrl: string | null = null;
  let errorMsg: string | null = null;
  let esCuestionario = false;

  if (archivo) {
    if (archivo.tipo === "cuestionario") {
      // Admin o acceso especial pueden ver el cuestionario.
      if (!esAdmin && !tieneAccesoEspecial) {
        errorMsg = "No autorizado";
      } else if (archivo.contenido_texto) {
        iframeSrcDoc = archivo.contenido_texto;
        esCuestionario = true;
        modo = "srcdoc";
      } else if (archivo.storage_key) {
        try {
          const r2Res = await getObjectStream(archivo.storage_key);
          if (!r2Res.ok) {
            errorMsg = `R2: ${r2Res.status}`;
          } else {
            iframeSrcDoc = await r2Res.text();
            esCuestionario = true;
            modo = "srcdoc";
          }
        } catch (e) {
          errorMsg = e instanceof Error ? e.message : "Error al leer el archivo";
        }
      } else {
        errorMsg = "Cuestionario sin contenido";
      }
    } else {
      if ((archivo.tipo === "material_privado" || archivo.tipo === "ficha") && !esAdmin && !tieneAccesoEspecial) {
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

  if (esCuestionario && iframeSrcDoc) {
    const bridgeScript = esAdmin ? BRIDGE_SCRIPT_ADMIN : BRIDGE_SCRIPT_READONLY;
    if (iframeSrcDoc.includes("</body>")) {
      iframeSrcDoc = iframeSrcDoc.replace("</body>", bridgeScript + "</body>");
    } else {
      iframeSrcDoc += bridgeScript;
    }
  }

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
          esCuestionario ? (
            <IframeEditorBridge
              srcDoc={iframeSrcDoc}
              archivoId={archivoId}
              sandbox={iframeSandbox}
            />
          ) : (
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
          )
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
