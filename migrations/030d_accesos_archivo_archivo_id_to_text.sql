-- =============================================
-- 030d: Cambiar archivo_id de UUID a TEXT en accesos_archivo
-- El tipo UUID no permite strings como "tutor-{materiaId}"
-- =============================================

-- 1. Eliminar FK si existe
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.conrelid = 'accesos_archivo'::regclass
      AND c.contype = 'f'
      AND a.attname = 'archivo_id'
  LOOP
    EXECUTE format('ALTER TABLE accesos_archivo DROP CONSTRAINT %I', r.conname);
    RAISE NOTICE 'Dropped FK: %', r.conname;
  END LOOP;
END $$;

-- 2. Cambiar tipo de columna UUID → TEXT
ALTER TABLE accesos_archivo ALTER COLUMN archivo_id TYPE text;

-- 3. Reconstruir el índice único (antes era sobre UUID, ahora sobre TEXT)
DROP INDEX IF EXISTS accesos_archivo_unico;
CREATE UNIQUE INDEX accesos_archivo_unico
  ON accesos_archivo (archivo_id, lower(nombre));

-- 4. Verificar
DO $$ BEGIN
  RAISE NOTICE 'Column type: %', (SELECT data_type FROM information_schema.columns WHERE table_name='accesos_archivo' AND column_name='archivo_id');
END $$;
