import { isAdminSession } from "./utils";
import { getPortalUserName } from "./portalUser";

const ADMIN_NOMBRE = process.env.NEXT_PUBLIC_ADMIN_NOMBRE?.trim().toLowerCase();

export async function trackActivity(data: {
  tipo: string;
  pagina?: string;
  materia_slug?: string;
  clase_id?: string;
  archivo_id?: string;
  metadata?: Record<string, unknown>;
}) {
  if (isAdminSession()) return;
  const usuario = getPortalUserName();
  if (ADMIN_NOMBRE && usuario && usuario.toLowerCase() === ADMIN_NOMBRE) return;
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
