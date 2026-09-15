-- Agregar 'asistente_open' al CHECK constraint de la tabla actividad
-- para permitir tracking del Asistente de Estudio

ALTER TABLE actividad DROP CONSTRAINT IF EXISTS actividad_tipo_check;

ALTER TABLE actividad ADD CONSTRAINT actividad_tipo_check CHECK (tipo IN (
  'page_view','play_start','play_pause','play_complete',
  'youtube_open','transcription_view',
  'usuario_registrado','heartbeat',
  'class_view','enlace_open','file_open','html_view',
  'file_download','transcription_download','admin_open',
  'asistente_open'
));
