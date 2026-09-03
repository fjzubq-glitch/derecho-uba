-- =============================================
-- 025: Audio binaural personal (solo admin)
-- Un único archivo para el reproductor de estudio.
-- =============================================

CREATE TABLE IF NOT EXISTS personal_binaural (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Solo una fila (el último subido es el activo)
CREATE INDEX IF NOT EXISTS idx_personal_binaural_created ON personal_binaural(created_at DESC);
