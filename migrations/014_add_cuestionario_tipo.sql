-- =============================================
-- 014: Agregar tipo cuestionario a archivos
-- Cuestionarios interactivos HTML, visibles solo para admin
-- =============================================

-- Eliminar el CHECK constraint anterior
ALTER TABLE archivos DROP CONSTRAINT IF EXISTS archivos_tipo_check;

-- Recrear con el nuevo tipo incluido
ALTER TABLE archivos ADD CONSTRAINT archivos_tipo_check
  CHECK (tipo IN ('audio_clase', 'clase_youtube', 'podcast', 'transcripcion', 'archivo', 'punteo_clase', 'enlace', 'youtube', 'cuestionario'));
