-- Almacena el contenido estructurado de los cuestionarios (para edición por campos)
ALTER TABLE archivos ADD COLUMN IF NOT EXISTS contenido jsonb;
