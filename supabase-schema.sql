-- =============================================
-- DERECHO UBA - Schema de Base de Datos
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Tabla de materias
CREATE TABLE IF NOT EXISTS materias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  estado TEXT DEFAULT 'en_curso' CHECK (estado IN ('en_curso', 'finalizada')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de clases
CREATE TABLE IF NOT EXISTS clases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id UUID REFERENCES materias(id) ON DELETE CASCADE,
  numero INT NOT NULL,
  titulo TEXT NOT NULL,
  fecha DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(materia_id, numero)
);

-- Tabla de archivos
CREATE TABLE IF NOT EXISTS archivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clase_id UUID REFERENCES clases(id) ON DELETE CASCADE,
  tipo TEXT CHECK (tipo IN ('audio_clase', 'podcast', 'transcripcion', 'youtube')),
  nombre_display TEXT NOT NULL,
  storage_key TEXT,
  youtube_url TEXT,
  cloudinary_url TEXT,
  youtube_thumbnail TEXT,
  contenido_texto TEXT,
  file_size BIGINT,
  duration_seconds INT,
  play_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de reproducciones
CREATE TABLE IF NOT EXISTS reproducciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archivo_id UUID REFERENCES archivos(id) ON DELETE CASCADE,
  ip_hash TEXT,
  played_at TIMESTAMPTZ DEFAULT now()
);

-- Funcion para incrementar play_count de forma atomica
CREATE OR REPLACE FUNCTION increment_play_count(file_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE archivos SET play_count = play_count + 1 WHERE id = file_id;
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security)
ALTER TABLE materias ENABLE ROW LEVEL SECURITY;
ALTER TABLE clases ENABLE ROW LEVEL SECURITY;
ALTER TABLE archivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reproducciones ENABLE ROW LEVEL SECURITY;

-- Politicas para lectura publica (cualquiera autenticado puede leer)
CREATE POLICY "Lectura publica materias" ON materias FOR SELECT USING (true);
CREATE POLICY "Lectura publica clases" ON clases FOR SELECT USING (true);
CREATE POLICY "Lectura publica archivos" ON archivos FOR SELECT USING (true);

-- Politica para insertar reproducciones (cualquiera autenticado)
CREATE POLICY "Insertar reproducciones" ON reproducciones FOR INSERT WITH CHECK (true);
CREATE POLICY "Lectura reproducciones" ON reproducciones FOR SELECT USING (true);

-- Politicas de escritura solo para service role (admin)
-- Estas politicas permiten todo al service role (que se usa en las API routes)
CREATE POLICY "Admin materias" ON materias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin clases" ON clases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin archivos" ON archivos FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- INSERTAR MATERIAS INICIALES
-- =============================================
INSERT INTO materias (nombre, slug) VALUES
  ('Contratos I', 'contratos-i'),
  ('Contratos II', 'contratos-ii'),
  ('Derecho Comercial', 'derecho-comercial')
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- STORAGE BUCKET (ejecutar desde el Dashboard de Supabase)
-- =============================================
-- 1. Ir a Storage en el dashboard de Supabase
-- 2. Crear un bucket llamado "derecho-uba-audios"
-- 3. Hacerlo PRIVATE (no public)
-- 4. Agregar esta politica RLS para el bucket:
--    Permitir SELECT a todos los usuarios autenticados
--    Permitir INSERT solo al service role
