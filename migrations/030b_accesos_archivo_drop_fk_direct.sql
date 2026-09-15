-- =============================================
-- 030b: Eliminar FK de accesos_archivo.archivo_id (directo)
-- Intenta los nombres más comunes de constraint FK en Supabase.
-- =============================================

-- Intentar eliminar con nombres típicos de Supabase
ALTER TABLE accesos_archivo DROP CONSTRAINT IF EXISTS accesos_archivo_archivo_id_fkey;
ALTER TABLE accesos_archivo DROP CONSTRAINT IF EXISTS accesos_archivo_archivo_id_key;
ALTER TABLE accesos_archivo DROP CONSTRAINT IF EXISTS fk_accesos_archivo_archivo;
ALTER TABLE accesos_archivo DROP CONSTRAINT IF EXISTS accesos_archivo_archivo_id_fkey1;

-- Verificar: buscar cualquier FK restante y eliminarla
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.table_name = 'accesos_archivo'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'archivo_id'
  LOOP
    EXECUTE format('ALTER TABLE accesos_archivo DROP CONSTRAINT %I', r.constraint_name);
    RAISE NOTICE 'Dropped FK: %', r.constraint_name;
  END LOOP;
END $$;
