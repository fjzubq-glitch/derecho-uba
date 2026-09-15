/**
 * Genera la URL de un archivo.
 * Para archivos públicos usa la URL directa de R2 o Cloudiny (sin pasar por Vercel).
 * Para archivos privados usa el proxy /api/stream que valida permisos.
 */
export function getArchivoUrl(archivo: {
  id: string;
  tipo: string;
  storage_key: string | null;
  cloudinary_url: string | null;
}, opts?: {
 /** Forzar proxy (ej. para contenido privado) */
  proxy?: boolean;
  /** Query string para el proxy (nombre, clave, etc.) */
  proxyQs?: string;
}): string {
  const { proxy = false, proxyQs } = opts || {};

  // Archivos privados siempre van por proxy (requiere auth check)
  const PRIVADOS = ["cuestionario", "material_privado", "ficha", "lexpodcast", "tutor"];
  if (proxy || PRIVADOS.includes(archivo.tipo)) {
    let url = `/api/stream/${archivo.id}`;
    if (proxyQs) url += `?${proxyQs}`;
    return url;
  }

  // Cloudinary: URL directa
  if (archivo.cloudinary_url) {
    return archivo.cloudinary_url;
  }

  // R2: URL directa del bucket público
  if (archivo.storage_key) {
    const R2_PUBLIC = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";
    if (R2_PUBLIC) {
      return `${R2_PUBLIC}/${archivo.storage_key}`;
    }
  }

  // Fallback: proxy
  return `/api/stream/${archivo.id}`;
}
