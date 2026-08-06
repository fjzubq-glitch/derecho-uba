import { isAdminSession } from "./utils";
import { getPortalUserName } from "./portalUser";

const ADMIN_NOMBRE = process.env.NEXT_PUBLIC_ADMIN_NOMBRE?.trim().toLowerCase();

/** El admin no cuenta en estadísticas: sesión activa o nombre configurado. */
export function isAdminUser(): boolean {
  if (isAdminSession()) return true;
  const usuario = getPortalUserName();
  return Boolean(ADMIN_NOMBRE && usuario && usuario.toLowerCase() === ADMIN_NOMBRE);
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
    await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        usuario,
      }),
    });
  } catch {
    // Silently fail - tracking should never break the app
  }
}
