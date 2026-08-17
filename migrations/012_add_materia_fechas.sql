-- =============================================
-- FECHAS IMPORTANTES POR MATERIA
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Tabla de fechas importantes (parciales, recuperatorios, finales, repasos)
CREATE TABLE IF NOT EXISTS materia_fechas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id UUID REFERENCES materias(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  fecha DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_materia_fechas_materia ON materia_fechas(materia_id);
CREATE INDEX IF NOT EXISTS idx_materia_fechas_fecha ON materia_fechas(fecha);

-- RLS: lectura pública (escritura solo via service role / API admin)
ALTER TABLE materia_fechas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura publica materia_fechas" ON materia_fechas FOR SELECT USING (true);

-- =============================================
-- SEED: fechas del ciclo lectivo (2026)
-- =============================================
INSERT INTO materia_fechas (materia_id, titulo, fecha)
SELECT id, 'Parcial', '2026-11-12' FROM materias WHERE slug = 'contratos-ii'
ON CONFLICT DO NOTHING;

INSERT INTO materia_fechas (materia_id, titulo, fecha)
SELECT id, 'Recuperatorio', '2026-11-26' FROM materias WHERE slug = 'contratos-ii'
ON CONFLICT DO NOTHING;

INSERT INTO materia_fechas (materia_id, titulo, fecha)
SELECT id, 'Examen final', '2026-12-03' FROM materias WHERE slug = 'contratos-ii'
ON CONFLICT DO NOTHING;

INSERT INTO materia_fechas (materia_id, titulo, fecha)
SELECT id, 'Repaso 1er parcial', '2026-10-02' FROM materias WHERE slug = 'derecho-comercial'
ON CONFLICT DO NOTHING;

INSERT INTO materia_fechas (materia_id, titulo, fecha)
SELECT id, '1er parcial (escrito, online)', '2026-10-06' FROM materias WHERE slug = 'derecho-comercial'
ON CONFLICT DO NOTHING;

INSERT INTO materia_fechas (materia_id, titulo, fecha)
SELECT id, 'Recuperatorio 1er parcial (oral)', '2026-10-20' FROM materias WHERE slug = 'derecho-comercial'
ON CONFLICT DO NOTHING;

INSERT INTO materia_fechas (materia_id, titulo, fecha)
SELECT id, 'Repaso 2do parcial', '2026-11-24' FROM materias WHERE slug = 'derecho-comercial'
ON CONFLICT DO NOTHING;

INSERT INTO materia_fechas (materia_id, titulo, fecha)
SELECT id, '2do parcial (escrito)', '2026-11-25' FROM materias WHERE slug = 'derecho-comercial'
ON CONFLICT DO NOTHING;

INSERT INTO materia_fechas (materia_id, titulo, fecha)
SELECT id, 'Recuperatorio 2do parcial (oral)', '2026-12-02' FROM materias WHERE slug = 'derecho-comercial'
ON CONFLICT DO NOTHING;

INSERT INTO materia_fechas (materia_id, titulo, fecha)
SELECT id, 'Final (presencial, oral)', '2026-12-04' FROM materias WHERE slug = 'derecho-comercial'
ON CONFLICT DO NOTHING;