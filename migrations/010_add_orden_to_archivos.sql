ALTER TABLE archivos ADD COLUMN IF NOT EXISTS orden INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_archivos_clase_orden ON archivos (clase_id, orden);

-- Asignar orden secuencial a archivos existentes por clase (0, 1, 2, ...)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY clase_id ORDER BY created_at) - 1 AS new_orden
  FROM archivos
)
UPDATE archivos SET orden = ranked.new_orden FROM ranked WHERE archivos.id = ranked.id;
