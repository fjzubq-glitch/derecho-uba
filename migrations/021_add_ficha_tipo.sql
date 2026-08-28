-- =============================================
-- 021: Agregar tipo ficha a archivos
-- Ficha = enlace a Notion, visible solo para el admin
-- =============================================

-- Eliminar el CHECK constraint anterior
ALTER TABLE archivos DROP CONSTRAINT IF EXISTS archivos_tipo_check;

-- Recrear con el nuevo tipo incluido
ALTER TABLE archivos ADD CONSTRAINT archivos_tipo_check
  CHECK (tipo IN ('audio_clase', 'clase_youtube', 'podcast', 'transcripcion', 'archivo', 'enlace', 'youtube', 'cuestionario', 'material_privado', 'ficha'));
