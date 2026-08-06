export const PORTAL_USER_KEY = "derecho_portal_user";
export const PORTAL_USER_EVENT = "portal-user-changed";

export function getPortalUserName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PORTAL_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { nombre?: string };
    return typeof parsed.nombre === "string" && parsed.nombre.trim() ? parsed.nombre.trim() : null;
  } catch {
    return null;
  }
}

export function setPortalUserName(nombre: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PORTAL_USER_KEY, JSON.stringify({ nombre: nombre.trim() }));
    window.dispatchEvent(new Event(PORTAL_USER_EVENT));
  } catch {
    // localStorage no disponible: ignorar
  }
}
