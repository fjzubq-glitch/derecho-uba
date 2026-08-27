-- =============================================
-- 019: Crear tabla fichas (contenido personal del admin)
-- Fichas de estudio editables con TipTap, organizadas por materia
-- =============================================

CREATE TABLE IF NOT EXISTS fichas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  contenido TEXT NOT NULL DEFAULT '',
  materia_id UUID REFERENCES materias(id) ON DELETE CASCADE,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS fichas_updated_at ON fichas;
CREATE TRIGGER fichas_updated_at
  BEFORE UPDATE ON fichas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
