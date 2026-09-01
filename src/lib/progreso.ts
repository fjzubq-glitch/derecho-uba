"use client";

const KEY_CLASES = "derecho:visto:clases";
const KEY_ARCHIVOS = "derecho:visto:archivos";

function readSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.filter((x) => typeof x === "string"));
    return new Set();
  } catch {
    return new Set();
  }
}

function writeSet(key: string, set: Set<string>): void {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {}
}

export function getVistosClases(): Set<string> {
  if (typeof window === "undefined") return new Set();
  return readSet(KEY_CLASES);
}

export function getVistosArchivos(): Set<string> {
  if (typeof window === "undefined") return new Set();
  return readSet(KEY_ARCHIVOS);
}

export function markClaseVista(claseId: string): void {
  if (typeof window === "undefined" || !claseId) return;
  const s = readSet(KEY_CLASES);
  if (s.has(claseId)) return;
  s.add(claseId);
  writeSet(KEY_CLASES, s);
}

export function markArchivoVisto(archivoId: string): void {
  if (typeof window === "undefined" || !archivoId) return;
  const s = readSet(KEY_ARCHIVOS);
  if (s.has(archivoId)) return;
  s.add(archivoId);
  writeSet(KEY_ARCHIVOS, s);
}

export function isClaseVista(claseId: string): boolean {
  if (typeof window === "undefined" || !claseId) return false;
  return readSet(KEY_CLASES).has(claseId);
}

export function isArchivoVisto(archivoId: string): boolean {
  if (typeof window === "undefined" || !archivoId) return false;
  return readSet(KEY_ARCHIVOS).has(archivoId);
}
