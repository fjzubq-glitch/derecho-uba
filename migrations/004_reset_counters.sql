-- Migracion: resetear contadores a cero
-- Ejecutar en Supabase SQL Editor

-- Resetear play_count de todos los archivos
UPDATE archivos SET play_count = 0;

-- Limpiar tabla de reproducciones
DELETE FROM reproducciones;

-- Limpiar tabla de actividad
DELETE FROM actividad;
