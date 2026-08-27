-- 020: Agregar clase_id a fichas para vincular fichas a clases específicas

ALTER TABLE fichas ADD COLUMN IF NOT EXISTS clase_id UUID REFERENCES clases(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_fichas_clase_id ON fichas(clase_id);
