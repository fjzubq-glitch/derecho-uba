-- =============================================
-- 022: Clave única por acceso especial
-- Cada persona autorizada a una materia recibe una
-- clave autogenerada. Para ver material privado se
-- necesita clave + nombre (doble verificación).
-- =============================================

-- Agregar columna clave si no existe
ALTER TABLE accesos_especiales ADD COLUMN IF NOT EXISTS clave TEXT;

-- Generar una clave aleatoria para los accesos existentes
-- (formato: 6 caracteres alfanuméricos en mayúscula)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE accesos_especiales
SET clave = upper(substr(md5(gen_random_uuid()::text), 1, 6))
WHERE clave IS NULL OR clave = '';

-- Asegurar que no haya duplicados antes de agregar la unicidad
DELETE FROM accesos_especiales a
USING accesos_especiales b
WHERE a.id > b.id
  AND a.clave = b.clave;

-- Hacerla obligatoria
ALTER TABLE accesos_especiales ALTER COLUMN clave SET NOT NULL;

-- Unicidad
CREATE UNIQUE INDEX IF NOT EXISTS accesos_especiales_clave_key
  ON accesos_especiales (clave);
