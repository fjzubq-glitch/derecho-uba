-- =============================================
-- 023: Nombre único global en accesos especiales
-- Si "Juan Pérez" tiene acceso a una materia,
-- nadie más puede registrarse como "Juan Pérez".
-- =============================================

-- Eliminar el constraint UNIQUE anterior (nombre + materia_id)
ALTER TABLE accesos_especiales DROP CONSTRAINT IF EXISTS accesos_especiales_nombre_materia_id_key;

-- Eliminar índice previo si existiera
DROP INDEX IF EXISTS accesos_especiales_nombre_lower_key;

-- Unicidad global por nombre (ignorando mayúsculas/minúsculas)
CREATE UNIQUE INDEX accesos_especiales_nombre_lower_key
  ON accesos_especiales (lower(nombre));
