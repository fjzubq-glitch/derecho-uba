"use client";

const KEY = "derecho:favoritos";

function readSet(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.filter((x) => typeof x === "string"));
    return new Set();
  } catch {
    return new Set();
  }
}

function writeSet(set: Set<string>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...set]));
  } catch {}
}

export function getFavoritos(): Set<string> {
  if (typeof window === "undefined") return new Set();
  return readSet();
}

export function isFavorito(id: string): boolean {
  if (typeof window === "undefined" || !id) return false;
  return readSet().has(id);
}

export function toggleFavorito(id: string): boolean {
  if (typeof window === "undefined" || !id) return false;
  const s = readSet();
  const next = s.has(id) ? (s.delete(id), false) : (s.add(id), true);
  writeSet(s);
  return next;
}
