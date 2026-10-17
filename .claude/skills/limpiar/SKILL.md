---
name: limpiar
description: Use after a feature works and tests pass, when the user asks to clean up, simplify or de-duplicate recently changed code without changing behavior.
argument-hint: "[foco opcional, p. ej. duplicación]"
---

Simplifica el código cambiado recientemente (`git diff`), con foco en $ARGUMENTS si lo hay.

- Quita imports, variables y código muerto.
- Extrae lógica repetida solo si se repite 3 o más veces.
- Aplana condicionales anidados y nombres poco claros.
- No cambies comportamiento ni interfaces públicas (exports, rutas `/api/*`, formato de lo guardado en IndexedDB o en las copias `.armario.json`).
- No toques ficheros fuera del diff.
- Ejecuta `npm test` antes y después; si algo falla después, deshaz ese cambio.

Formato de salida:

**Cambios:** una línea por cambio hecho.

**Verificado:** comandos ejecutados y resultado.
