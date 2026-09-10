-- 029: Mejora del ranking de LexSearch
-- Problema: ts_rank satura en 1.0 y las leyes modificatorias aparecian primero.
-- Solucion: score compuesto que premia coincidencia de titulo/sumario, leyes base
-- (muchas veces modificadas) y tipo Ley, y penaliza modificatorias.

CREATE OR REPLACE FUNCTION norm_tit(t TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT btrim(regexp_replace(upper(coalesce(t, '')), '\s+', ' ', 'g'));
$$;

DROP FUNCTION IF EXISTS buscar_leyes_infoleg(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER);

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
  qn  TEXT;
  mod_pat CONSTANT TEXT := 'MODIFICACION|MODIFICA|ABROGA|DEROGA|SUSTITU|ADECUACION|INCORPORA|PROMULGACION|REFORMA';
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

  qn := norm_tit(q);
  tsq := websearch_to_tsquery('spanish', q);

  RETURN QUERY
    SELECT l.id_norma, l.tipo_norma, l.numero_norma, l.clase_norma,
           l.organismo_origen, l.fecha_sancion, l.titulo_resumido,
           l.titulo_sumario, l.texto_resumido, l.texto_original,
           l.texto_actualizado, l.modificada_por, l.modifica_a,
           (
             ts_rank(l.search_vector, tsq) * 10
             + CASE WHEN norm_tit(l.titulo_sumario)  = qn THEN 500 ELSE 0 END
             + CASE WHEN norm_tit(l.titulo_resumido) = qn THEN 400 ELSE 0 END
             + CASE WHEN norm_tit(l.titulo_sumario)  LIKE qn || '%' THEN 100 ELSE 0 END
             + CASE WHEN norm_tit(l.titulo_resumido) LIKE qn || '%' THEN 80  ELSE 0 END
             + CASE WHEN norm_tit(l.titulo_sumario)  LIKE '%' || qn || '%' THEN 30 ELSE 0 END
             + least(coalesce(l.modificada_por, 0), 50) * 8
             + CASE l.tipo_norma
                 WHEN 'Ley' THEN 40
                 WHEN 'Decreto/Ley' THEN 30
                 WHEN 'Decreto' THEN 10
                 ELSE 0
               END
             - CASE WHEN norm_tit(l.titulo_resumido) ~ mod_pat AND qn !~ mod_pat THEN 200 ELSE 0 END
             - CASE WHEN norm_tit(l.titulo_sumario)  ~ mod_pat AND qn !~ mod_pat THEN 100 ELSE 0 END
           )::REAL AS rank
    FROM leyes_infoleg l
    WHERE l.search_vector @@ tsq
      AND (tipo_filtro = '' OR l.tipo_norma = tipo_filtro)
      AND (numero_filtro = '' OR l.numero_norma = numero_filtro)
      AND (anio_filtro = '' OR EXTRACT(YEAR FROM l.fecha_sancion)::TEXT = anio_filtro)
    ORDER BY rank DESC, l.fecha_sancion DESC NULLS LAST
    LIMIT limite OFFSET desplazamiento;
END;
$$;

NOTIFY pgrst, 'reload schema';
