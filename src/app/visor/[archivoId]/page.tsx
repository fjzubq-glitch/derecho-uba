import VolverBoton from "@/components/VolverBoton";
import { cookies } from "next/headers";
import { isAdminRequest, verifyVisorToken } from "@/lib/auth";
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

  const iframeSandbox = "allow-scripts allow-same-origin allow-forms allow-popups allow-modals";

  let iframeSrc: string | null = null;
  let iframeSrcDoc: string | null = null;
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
          }
        } catch (e) {
          errorMsg = e instanceof Error ? e.message : "Error al leer el archivo";
        }
      } else if (archivo.contenido_texto) {
        iframeSrcDoc = archivo.contenido_texto;
      } else {
        errorMsg = "Cuestionario sin contenido";
      }
    } else {
      iframeSrc = `/api/stream/${archivoId}`;
    }
  } else {
    errorMsg = "Archivo no encontrado";
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        background: "var(--color-ink)",
        overflow: "hidden",
      }}
    >
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
