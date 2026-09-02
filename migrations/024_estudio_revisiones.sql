-- =============================================
-- 024: Sistema de estudio espaciado (solo admin)
-- Repetición 3/7/21 por clase + refuerzo pre-examen.
-- Estado persistido en DB para que el cron de
-- Telegram sepa qué ya se repasó.
-- =============================================

CREATE TABLE IF NOT EXISTS estudio_revisiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id UUID REFERENCES materias(id) ON DELETE CASCADE,
  clase_id UUID REFERENCES clases(id) ON DELETE CASCADE,
  exam_date_id UUID REFERENCES materia_fechas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('inicial','repaso1','repaso2','repaso3','examen_repaso','examen_vistazo')),
  fecha_programada DATE NOT NULL,
  hecha BOOLEAN DEFAULT false,
  completada_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estudio_materia ON estudio_revisiones(materia_id);
CREATE INDEX IF NOT EXISTS idx_estudio_clase ON estudio_revisiones(clase_id);
CREATE INDEX IF NOT EXISTS idx_estudio_fecha ON estudio_revisiones(fecha_programada);
CREATE INDEX IF NOT EXISTS idx_estudio_pendiente ON estudio_revisiones(hecha, fecha_programada);

-- Unicidad por clase/tipo (items de clase)
CREATE UNIQUE INDEX IF NOT EXISTS idx_estudio_clase_tipo
  ON estudio_revisiones (clase_id, tipo) WHERE clase_id IS NOT NULL;

-- Unicidad por examen/tipo (items pre-examen)
CREATE UNIQUE INDEX IF NOT EXISTS idx_estudio_exam_tipo
  ON estudio_revisiones (exam_date_id, tipo) WHERE exam_date_id IS NOT NULL;

-- RLS
ALTER TABLE estudio_revisiones ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Log de notificaciones (evita spam duplicado)
-- =============================================
CREATE TABLE IF NOT EXISTS estudio_notifs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL UNIQUE,
  enviada_at TIMESTAMPTZ DEFAULT now()
);
