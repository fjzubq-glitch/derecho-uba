-- 028: Base de datos legislativa InfoLeg para LexSearch
-- Fuente: dataset abierto del Ministerio de Justicia (datos.jus.gob.ar)
-- Tabla con full-text search en español, pesos por campo y RPCs de ranking.

CREATE TABLE IF NOT EXISTS leyes_infoleg (
  id_norma          TEXT PRIMARY KEY,
  tipo_norma        TEXT NOT NULL,
  numero_norma      TEXT,
  clase_norma       TEXT,
  organismo_origen  TEXT,
  fecha_sancion     DATE,
  titulo_resumido   TEXT,
  titulo_sumario    TEXT,
  texto_resumido    TEXT,
  texto_original    TEXT,
  texto_actualizado TEXT,
  modificada_por    INTEGER DEFAULT 0,
  modifica_a        INTEGER DEFAULT 0,
  search_vector     tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('spanish', COALESCE(titulo_resumido, '')), 'A') ||
    setweight(to_tsvector('spanish', COALESCE(titulo_sumario, '')), 'B') ||
    setweight(to_tsvector('spanish', COALESCE(texto_resumido, '')), 'C')
  ) STORED
);

CREATE INDEX IF NOT EXISTS leyes_infoleg_search_idx
  ON leyes_infoleg USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS leyes_infoleg_tipo_numero_idx
  ON leyes_infoleg (tipo_norma, numero_norma);

CREATE INDEX IF NOT EXISTS leyes_infoleg_numero_idx
  ON leyes_infoleg (numero_norma);

CREATE INDEX IF NOT EXISTS leyes_infoleg_tipo_fecha_idx
  ON leyes_infoleg (tipo_norma, fecha_sancion DESC);

-- Lectura pública (la app consulta server-side, pero permitimos lectura anon)
ALTER TABLE leyes_infoleg ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS leyes_infoleg_public_read ON leyes_infoleg;
CREATE POLICY leyes_infoleg_public_read ON leyes_infoleg
  FOR SELECT USING (true);

-- RPC de búsqueda con ranking. Devuelve metadata + rank.
DROP FUNCTION IF EXISTS buscar_leyes_infoleg(TEXT, TEXT, TEXT, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION buscar_leyes_infoleg(
  q              TEXT,
  tipo_filtro    TEXT DEFAULT '',
  numero_filtro  TEXT DEFAULT '',
  anio_filtro    TEXT DEFAULT '',
  limite         INTEGER DEFAULT 20,
  desplazamiento INTEGER DEFAULT 0
)
RETURNS TABLE (
  id_norma          TEXT,
  tipo_norma        TEXT,
  numero_norma      TEXT,
  clase_norma       TEXT,
  organismo_origen  TEXT,
  fecha_sancion     DATE,
  titulo_resumido   TEXT,
  titulo_sumario    TEXT,
  texto_resumido    TEXT,
  texto_original    TEXT,
  texto_actualizado TEXT,
  modificada_por    INTEGER,
  modifica_a        INTEGER,
  rank              REAL
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  tsq tsquery;
BEGIN
  IF q IS NULL OR btrim(q) = '' THEN
    RETURN QUERY
      SELECT l.id_norma, l.tipo_norma, l.numero_norma, l.clase_norma,
             l.organismo_origen, l.fecha_sancion, l.titulo_resumido,
             l.titulo_sumario, l.texto_resumido, l.texto_original,
             l.texto_actualizado, l.modificada_por, l.modifica_a, 0::REAL
      FROM leyes_infoleg l
      WHERE (tipo_filtro = '' OR l.tipo_norma = tipo_filtro)
        AND (numero_filtro = '' OR l.numero_norma = numero_filtro)
        AND (anio_filtro = '' OR EXTRACT(YEAR FROM l.fecha_sancion)::TEXT = anio_filtro)
      ORDER BY l.fecha_sancion DESC NULLS LAST
      LIMIT limite OFFSET desplazamiento;
    RETURN;
  END IF;

  tsq := websearch_to_tsquery('spanish', q);

  RETURN QUERY
    SELECT l.id_norma, l.tipo_norma, l.numero_norma, l.clase_norma,
           l.organismo_origen, l.fecha_sancion, l.titulo_resumido,
           l.titulo_sumario, l.texto_resumido, l.texto_original,
           l.texto_actualizado, l.modificada_por, l.modifica_a,
           ts_rank(l.search_vector, tsq)::REAL AS rank
    FROM leyes_infoleg l
    WHERE l.search_vector @@ tsq
      AND (tipo_filtro = '' OR l.tipo_norma = tipo_filtro)
      AND (numero_filtro = '' OR l.numero_norma = numero_filtro)
      AND (anio_filtro = '' OR EXTRACT(YEAR FROM l.fecha_sancion)::TEXT = anio_filtro)
    ORDER BY rank DESC, l.fecha_sancion DESC NULLS LAST
    LIMIT limite OFFSET desplazamiento;
END;
$$;

-- Contador de resultados para paginación (mismo criterio que la búsqueda)
DROP FUNCTION IF EXISTS contar_leyes_infoleg(TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION contar_leyes_infoleg(
  q             TEXT,
  tipo_filtro   TEXT DEFAULT '',
  numero_filtro TEXT DEFAULT '',
  anio_filtro   TEXT DEFAULT ''
)
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  tsq tsquery;
  total BIGINT;
BEGIN
  IF q IS NULL OR btrim(q) = '' THEN
    SELECT count(*) INTO total
    FROM leyes_infoleg l
    WHERE (tipo_filtro = '' OR l.tipo_norma = tipo_filtro)
      AND (numero_filtro = '' OR l.numero_norma = numero_filtro)
      AND (anio_filtro = '' OR EXTRACT(YEAR FROM l.fecha_sancion)::TEXT = anio_filtro);
    RETURN total;
  END IF;

  tsq := websearch_to_tsquery('spanish', q);
  SELECT count(*) INTO total
  FROM leyes_infoleg l
  WHERE l.search_vector @@ tsq
    AND (tipo_filtro = '' OR l.tipo_norma = tipo_filtro)
    AND (numero_filtro = '' OR l.numero_norma = numero_filtro)
    AND (anio_filtro = '' OR EXTRACT(YEAR FROM l.fecha_sancion)::TEXT = anio_filtro);
  RETURN total;
END;
$$;
