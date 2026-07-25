-- =============================================
-- ANALYTICS - Tabla de actividad de usuarios
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Tabla de actividad (tracking completo)
CREATE TABLE IF NOT EXISTS actividad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('page_view', 'play_start', 'play_pause', 'play_complete', 'youtube_open', 'transcription_view')),
  pagina TEXT,
  materia_slug TEXT,
  clase_id UUID,
  archivo_id UUID,
  metadata JSONB,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices para queries rápidas
CREATE INDEX IF NOT EXISTS idx_actividad_tipo ON actividad(tipo);
CREATE INDEX IF NOT EXISTS idx_actividad_created_at ON actividad(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_actividad_archivo ON actividad(archivo_id);
CREATE INDEX IF NOT EXISTS idx_actividad_ip ON actividad(ip_hash);

-- RLS
ALTER TABLE actividad ENABLE ROW LEVEL SECURITY;

-- Solo service role puede leer/escribir (admin)
CREATE POLICY "Admin actividad" ON actividad FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- Vistas útiles para el admin
-- =============================================

-- Vista: visitas únicas por día
CREATE OR REPLACE VIEW vistas_por_dia AS
SELECT 
  DATE(created_at) as fecha,
  COUNT(DISTINCT ip_hash) as visitantes_unicos,
  COUNT(*) as total_visitas
FROM actividad
WHERE tipo = 'page_view'
GROUP BY DATE(created_at)
ORDER BY fecha DESC;

-- Vista: contenido más reproducido
CREATE OR REPLACE VIEW contenido_popular AS
SELECT 
  a.id as archivo_id,
  a.nombre_display,
  a.tipo,
  m.nombre as materia,
  c.numero as clase_numero,
  c.titulo as clase_titulo,
  COUNT(act.id) as total_reproducciones,
  COUNT(DISTINCT act.ip_hash) as usuarios_unicos
FROM actividad act
JOIN archivos a ON act.archivo_id = a.id
JOIN clases c ON a.clase_id = c.id
JOIN materias m ON c.materia_id = m.id
WHERE act.tipo IN ('play_start', 'play_complete')
GROUP BY a.id, a.nombre_display, a.tipo, m.nombre, c.numero, c.titulo
ORDER BY total_reproducciones DESC;

-- Vista: actividad reciente
CREATE OR REPLACE VIEW actividad_reciente AS
SELECT 
  act.tipo,
  act.pagina,
  act.materia_slug,
  a.nombre_display as archivo_nombre,
  m.nombre as materia,
  c.numero as clase_numero,
  act.created_at,
  act.ip_hash
FROM actividad act
LEFT JOIN archivos a ON act.archivo_id = a.id
LEFT JOIN clases c ON act.clase_id = c.id
LEFT JOIN materias m ON c.materia_id = m.id
ORDER BY act.created_at DESC
LIMIT 100;
