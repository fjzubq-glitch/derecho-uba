-- 008: agregar nombre de usuario a la tabla de actividad
ALTER TABLE actividad
  ADD COLUMN IF NOT EXISTS nombre TEXT;

-- índice para agrupar por nombre en el panel admin
CREATE INDEX IF NOT EXISTS idx_actividad_nombre ON actividad (nombre);
