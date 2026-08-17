---
description: Revisión completa del proyecto: verificación de calidad, revisión del código pendiente y resumen final.
---

# Revisión completa del proyecto

Ejecutá una revisión integral y reportá un resumen final. Pasos:

1. Delegá en el agente **qa** (subagente): que corra typecheck, lint y build del proyecto y devuelva el veredicto.
2. Delegá en el agente **revisor-codigo** (subagente): que revise el diff pendiente (`git status` + `git diff`) y, si no hay nada pendiente, los últimos 3 commits (`git log --oneline -3`).
3. Si el usuario lo pidió explícitamente o si el veredicto de qa falla por dependencias, delegá también en **actualizador-dependencias**.

Finalizá con un resumen compacto:
- Veredicto de calidad (qa): PASA/FALLA con bloqueos
- Veredicto de código (revisor): APROBADO / CON OBSERVACIONES / RECHAZADO + hallazgos top
- Lista de acciones concretas recomendadas, ordenadas por prioridad
