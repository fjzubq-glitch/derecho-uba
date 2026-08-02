-- Migracion: agregar campo estado a la tabla materias
-- Ejecutar en Supabase SQL Editor

ALTER TABLE materias
ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'en_curso' CHECK (estado IN ('en_curso', 'finalizada'));
