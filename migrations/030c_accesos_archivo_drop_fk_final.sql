-- =============================================
-- 030c: Eliminar TODAS las FK de accesos_archivo
-- Usa pg_constraint directamente (no information_schema)
-- =============================================

-- 1. Verificar si existe la tabla
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'accesos_archivo') THEN
    RAISE EXCEPTION 'Table accesos_archivo does not exist';
  END IF;
END $$;

-- 2. Eliminar TODAS las FK constraints sobre archivo_id
DO $$
DECLARE
  r RECORD;
  dropped INT := 0;
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
    dropped := dropped + 1;
    RAISE NOTICE 'Dropped FK: %', r.conname;
  END LOOP;
  IF dropped = 0 THEN
    RAISE NOTICE 'No FK constraints found on accesos_archivo.archivo_id';
  ELSE
    RAISE NOTICE 'Total FKs dropped: %', dropped;
  END IF;
END $$;

-- 3. Verificar que no quede ninguna FK
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.conrelid = 'accesos_archivo'::regclass
      AND c.contype = 'f'
      AND a.attname = 'archivo_id'
  ) THEN
    RAISE WARNING 'FK constraints still exist on archivo_id!';
  ELSE
    RAISE NOTICE 'OK: No FK on archivo_id';
  END IF;
END $$;
