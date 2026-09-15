-- =============================================
-- 030: Eliminar FK de accesos_archivo.archivo_id
-- Permite entradas virtuales como "tutor-{materiaId}"
-- que no existen en la tabla archivos.
-- =============================================

-- Eliminar el constraint FK (el nombre varía, buscamos el correcto)
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  WHERE tc.table_name = 'accesos_archivo'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'archivo_id'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE accesos_archivo DROP CONSTRAINT %I', constraint_name);
    RAISE NOTICE 'Dropped FK constraint: %', constraint_name;
  ELSE
    RAISE NOTICE 'No FK constraint found on accesos_archivo.archivo_id';
  END IF;
END $$;
