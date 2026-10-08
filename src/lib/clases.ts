export interface VecinoClase {
  numero: number;
  titulo: string;
}

// Devuelve [anterior, siguiente] a partir de la lista ordenada de clases de la
// materia. No depende de "numero ± 1": salta huecos de numeración (ej. una
// clase no subida) y cruza parciales sin cortar la navegación.
export function resolverAdyacentes(clases: VecinoClase[], num: number): VecinoClase[] {
  const ordenadas = clases.slice().sort((a, b) => a.numero - b.numero);
  const anterior = ordenadas.filter((c) => c.numero < num).pop() || null;
  const siguiente = ordenadas.find((c) => c.numero > num) || null;
  return [anterior, siguiente].filter((c): c is VecinoClase => c !== null);
}

// Misma lógica pero ya separada, para el cliente (estado prev/next).
export function vecinosDe(
  adyacentes: VecinoClase[],
  num: number
): { prev: VecinoClase | null; next: VecinoClase | null } {
  const ordenadas = adyacentes.slice().sort((a, b) => a.numero - b.numero);
  return {
    prev: ordenadas.filter((c) => c.numero < num).pop() || null,
    next: ordenadas.find((c) => c.numero > num) || null,
  };
}
