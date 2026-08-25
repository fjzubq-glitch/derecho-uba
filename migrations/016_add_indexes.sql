-- =============================================
-- 016 - Índices para rendimiento de consultas
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- FK sin índice -> sequential scan en cada join/filter
CREATE INDEX IF NOT EXISTS idx_clases_materia_id ON clases(materia_id);
CREATE INDEX IF NOT EXISTS idx_archivos_clase_id ON archivos(clase_id);

-- Consultas frecuentes por tipo (+ counts exactos en dashboard)
CREATE INDEX IF NOT EXISTS idx_archivos_tipo ON archivos(tipo);

-- La materia dashboard filtra por slug
CREATE INDEX IF NOT EXISTS idx_materias_slug ON materias(slug);

-- Miradas al calendario: filtrar por materia y ordenar por fecha
CREATE INDEX IF NOT EXISTS idx_materia_fechas_materia_id ON materia_fechas(materia_id);

-- Analytics: la tabla actividad es la más consultada por (tipo, created_at)
CREATE INDEX IF NOT EXISTS idx_actividad_tipo ON actividad(tipo);
CREATE INDEX IF NOT EXISTS idx_actividad_created_at ON actividad(created_at);
CREATE INDEX IF NOT EXISTS idx_actividad_materia_slug ON actividad(materia_slug);
CREATE INDEX IF NOT EXISTS idx_actividad_archivo_id ON actividad(archivo_id);
CREATE INDEX IF NOT EXISTS idx_actividad_ip_hash ON actividad(ip_hash);
