-- =============================================
-- 026: Acceso por archivo (premios)
-- Permite habilitar UN archivo privado puntual
-- a alumnos seleccionados (por nombre), sin darles
-- la clave de toda la materia.
-- =============================================

CREATE TABLE IF NOT EXISTS accesos_archivo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archivo_id UUID REFERENCES archivos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accesos_archivo_archivo ON accesos_archivo(archivo_id);

-- Un alumno no puede tener dos grants sobre el mismo archivo
-- (ignorando mayúsculas/minúsculas, como en accesos_especiales)
CREATE UNIQUE INDEX IF NOT EXISTS accesos_archivo_unico
  ON accesos_archivo (archivo_id, lower(nombre));
