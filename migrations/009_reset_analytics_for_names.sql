-- 009: reset de analíticas antes del nuevo conteo con nombres
UPDATE archivos SET play_count = 0;
DELETE FROM reproducciones;
DELETE FROM actividad;
