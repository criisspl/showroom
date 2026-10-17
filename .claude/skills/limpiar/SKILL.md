---
name: limpiar
description: Use after a feature works and tests pass, when the user asks to clean up, simplify or de-duplicate recently changed code.
argument-hint: "[foco opcional, p. ej. duplicación]"
---

Simplifica el código cambiado recientemente (`git diff`), con foco en $ARGUMENTS si lo hay.

- Quita imports, variables y código muerto.
- Extrae lógica repetida solo si se repite 3 o más veces.
- Aplana condicionales anidados y nombres poco claros.
- No cambies comportamiento: los tests deben seguir en verde. Ejecútalos al terminar.
- No toques ficheros fuera del diff.

Al final, una línea por cambio hecho.
