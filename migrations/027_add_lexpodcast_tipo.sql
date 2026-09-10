-- 027: Agregar tipo 'lexpodcast' (audio privado, solo admin + premios)
ALTER TABLE archivos DROP CONSTRAINT IF EXISTS archivos_tipo_check;
ALTER TABLE archivos ADD CONSTRAINT archivos_tipo_check
  CHECK (tipo IN ('audio_clase', 'clase_youtube', 'podcast', 'transcripcion', 'archivo', 'enlace', 'youtube', 'cuestionario', 'material_privado', 'ficha', 'lexpodcast'));
