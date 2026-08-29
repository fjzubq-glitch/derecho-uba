import { isAdminSession } from "./utils";
import { getPortalUserName } from "./portalUser";

/** El admin no cuenta en estadísticas. Se excluye por su sesión local para no
 *  exponer NEXT_PUBLIC_ADMIN_NOMBRE en el bundle del cliente. */
export function isAdminUser(): boolean {
  return isAdminSession();
}

export async function trackActivity(data: {
  tipo: string;
  pagina?: string;
  materia_slug?: string;
  clase_id?: string;
  archivo_id?: string;
  metadata?: Record<string, unknown>;
}) {
  if (isAdminUser()) return;
  const usuario = getPortalUserName();
  try {
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        ...data,
        usuario,
      }),
    });
  } catch {
    // Silently fail - tracking should never break the app
  }
}
