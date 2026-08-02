-- Migracion: agregar campo nota a la tabla archivos
-- Ejecutar en Supabase SQL Editor

ALTER TABLE archivos
ADD COLUMN IF NOT EXISTS nota TEXT;
