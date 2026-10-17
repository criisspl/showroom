---
name: revisar
description: Use when the user asks to review recent changes, a diff, pasted code or a PR for bugs and correctness before committing or merging.
argument-hint: "[número de PR o vacío para cambios locales]"
---

Revisa $ARGUMENTS (si está vacío, los cambios locales: `git diff` y `git diff --staged`; si es un PR, su diff).

Solo lectura: no edites ficheros, no hagas commit ni push. Puedes ejecutar `npm test` y `npm run build` para comprobar cosas.

Antes de revisar, mira `CLAUDE.md` y los ficheros que llaman al código cambiado.

Busca, por orden de gravedad:
1. Bugs y lógica rota: condiciones invertidas, off-by-one, `await` olvidados, nulos sin controlar.
2. Casos límite: listas vacías, errores de red, estados de carga y error en la UI.
3. Seguridad y privacidad: entrada sin validar, secretos en código, `innerHTML` con datos de usuario, datos que salen del dispositivo.
4. Tests: ¿lo nuevo tiene test? ¿algún test se ha debilitado o saltado?
5. Convenciones del repo (`CLAUDE.md`).

No afirmes un bug sin señalar la línea y el caso que lo dispara.

Formato de salida, siempre igual:

**Veredicto:** listo para merge / no listo (una frase de por qué)

**Hallazgos** (si hay): `fichero:línea` · alta/media/baja · problema · arreglo en una línea

**Verificado:** comandos ejecutados y resultado; y lo que no se pudo ejecutar.

Sin elogios ni resumen extra.
