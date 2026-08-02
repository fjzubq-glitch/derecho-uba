-- =============================================
-- SEGURIDAD: Eliminar políticas de escritura abiertas
-- Todas las escrituras pasan por API routes con service_role
-- (que bypasea RLS). Estas políticas permitían escritura al anon key.
-- Ejecutar en Supabase SQL Editor.
-- =============================================

DROP POLICY IF EXISTS "Admin materias" ON materias;
DROP POLICY IF EXISTS "Admin clases" ON clases;
DROP POLICY IF EXISTS "Admin archivos" ON archivos;
DROP POLICY IF EXISTS "Admin actividad" ON actividad;

DROP POLICY IF EXISTS "Insertar reproducciones" ON reproducciones;
