// Tipos de contenido privado + normalización de nombres para grants.
// Centralizado para no triplicar constantes ni criterios de match.

export const TIPOS_PRIVADOS = ["cuestionario", "material_privado", "ficha"];

// Normaliza para comparar: trim + colapsa espacios + minúsculas + sin tildes.
// "  María  Pérez " y "maria perez" matchean igual.
export function normalizarNombreGrant(n: string | null | undefined): string {
  return (n || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// true si `nombre` (visitante) coincide con algún grant de la lista (nombres en DB).
export function tieneGrant(grants: Array<{ nombre?: string | null }>, nombre: string | null | undefined): boolean {
  const key = normalizarNombreGrant(nombre);
  if (!key) return false;
  return grants.some((g) => normalizarNombreGrant(g.nombre) === key);
}
