-- =============================================
-- 017: Remover tipo video_resumen de archivos
-- (Ya no se usan videos resumen en la web)
-- =============================================

-- Eliminar el CHECK constraint anterior
ALTER TABLE archivos DROP CONSTRAINT IF EXISTS archivos_tipo_check;

-- Recrear sin video_resumen
ALTER TABLE archivos ADD CONSTRAINT archivos_tipo_check
  CHECK (tipo IN ('audio_clase', 'clase_youtube', 'podcast', 'transcripcion', 'archivo', 'enlace', 'youtube', 'cuestionario'));
