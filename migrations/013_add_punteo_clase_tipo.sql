-- =============================================
-- 013: Agregar tipo punteo_clase a archivos
-- Separa "punteo de clase" (apuntes propios) de "archivo" (PDFs/materiales)
-- =============================================

-- Eliminar el CHECK constraint anterior
ALTER TABLE archivos DROP CONSTRAINT IF EXISTS archivos_tipo_check;

-- Recrear con el nuevo tipo incluido
ALTER TABLE archivos ADD CONSTRAINT archivos_tipo_check
  CHECK (tipo IN ('audio_clase', 'clase_youtube', 'podcast', 'transcripcion', 'archivo', 'punteo_clase', 'enlace', 'youtube'));
