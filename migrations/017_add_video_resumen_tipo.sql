-- =============================================
-- 017: Agregar tipo video_resumen a archivos
-- Videos resumen de YouTube para cada clase
-- =============================================

-- Eliminar el CHECK constraint anterior
ALTER TABLE archivos DROP CONSTRAINT IF EXISTS archivos_tipo_check;

-- Recrear con el nuevo tipo incluido
ALTER TABLE archivos ADD CONSTRAINT archivos_tipo_check
  CHECK (tipo IN ('audio_clase', 'clase_youtube', 'podcast', 'transcripcion', 'archivo', 'punteo_clase', 'enlace', 'youtube', 'cuestionario', 'video_resumen'));
