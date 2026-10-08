-- Segmenta las clases por parcial.
-- 1 = primer parcial, 2 = segundo parcial.
-- Todas las clases existentes quedan en el primer parcial por defecto.
ALTER TABLE clases ADD COLUMN IF NOT EXISTS parcial SMALLINT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_clases_materia_parcial ON clases (materia_id, parcial);

COMMENT ON COLUMN clases.parcial IS 'Parcial al que pertenece la clase: 1 = primer parcial, 2 = segundo parcial';
