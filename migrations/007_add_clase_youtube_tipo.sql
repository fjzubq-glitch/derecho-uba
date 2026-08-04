-- =============================================
-- SEGURIDAD / EVOLUCIÓN: Agregar tipo "clase_youtube"
-- a la constraint de la tabla archivos.
-- Ejecutar en Supabase SQL Editor.
-- =============================================

ALTER TABLE archivos DROP CONSTRAINT IF EXISTS archivos_tipo_check;

ALTER TABLE archivos ADD CONSTRAINT archivos_tipo_check
  CHECK (tipo IN ('audio_clase', 'clase_youtube', 'podcast', 'transcripcion', 'archivo', 'enlace', 'youtube'));