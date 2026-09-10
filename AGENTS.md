# Reglas del proyecto

- Después de cada cambio (feature, fix, refactor), hacer el commit de git automáticamente, sin esperar a que lo pida el usuario.
- Revisar `git status` / `git diff` antes de commitear; commitear solo los archivos intencionales.
- Mensajes de commit concisos en español, describiendo el cambio.
- Después de commitear, hacer `git push origin main` automáticamente para que Vercel redeploy.
- Auditoría de rendimiento 1-2 veces por semana (acordado con el usuario): medir TTFB y tamaño de home, página de materia y API de clase en producción; revisar roundtrips a Supabase, payloads (ej. `contenido_texto`), caché (`unstable_cache` + `revalidateTag`) y bundle JS. Corregir lo necesario con el mismo flujo commit+push.
