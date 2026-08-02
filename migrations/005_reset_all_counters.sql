-- Reset all counters to zero
UPDATE archivos SET play_count = 0;
DELETE FROM reproducciones;
DELETE FROM actividad;
