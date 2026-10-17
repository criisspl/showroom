---
name: revisar
description: Use when the user asks to review recent changes, a diff or a PR for bugs and correctness before committing or merging.
argument-hint: "[número de PR o vacío para cambios locales]"
---

Revisa $ARGUMENTS (si está vacío, los cambios locales: `git diff` y `git diff --staged`).

Busca, por orden de gravedad:
1. Bugs y lógica rota: condiciones invertidas, off-by-one, `await` olvidados, nulos sin controlar.
2. Casos límite: listas vacías, errores de red, estados de carga y error en la UI.
3. Seguridad: entrada sin validar, secretos en código, `innerHTML` con datos de usuario.
4. Tests: ¿lo nuevo tiene test? ¿algún test se ha debilitado?
5. Convenciones del repo (mira `CLAUDE.md`).

Formato: lista de hallazgos con `fichero:línea`, gravedad (alta/media/baja) y arreglo propuesto en una línea. Sin elogios ni resumen. Si no hay nada grave, dilo en una frase.

No cambies código salvo que te lo pida.
