# CLAUDE.md

Instrucciones para Claude en este repo. Cada línea está aquí porque sin ella Claude se equivocaría; si una deja de hacer falta, bórrala.

## Stack y comandos

- TypeScript estricto en `src/lib/`, `src/data/` y `worker/`; la interfaz (`src/ui/`) sigue en JavaScript hasta pasarla a Svelte 5. Vite, Node 22.
- Imports con extensión `.ts` explícita (`allowImportingTsExtensions`). Tipos del dominio en `src/lib/tipos.ts`.
- Backend: Cloudflare Worker (`worker/`) que solo hace de intermediario con la IA; config en `wrangler.jsonc`.
- Datos: IndexedDB en el navegador (`src/lib/store.ts`). Sin cuentas ni base de datos en servidor.
- Tests: Vitest + `node:assert/strict`, con `fake-indexeddb` para el store.

| Qué            | Comando                           |
| -------------- | --------------------------------- |
| Instalar       | `npm ci`                          |
| Dev (solo web) | `npm run dev`                     |
| Dev con API    | `npm run dev:api`                 |
| Tests          | `npm test`                        |
| Tipos          | `npm run typecheck`               |
| Lint y formato | `npm run lint` · `npm run format` |
| Build          | `npm run build`                   |

CI (`.github/workflows/ci.yml`) ejecuta lint, formato, tipos, tests con cobertura mínima y build: todo tiene que pasar antes de dar algo por hecho. Los commits siguen Conventional Commits (commitlint).

## Estructura

- `src/lib/`: lógica sin DOM (análisis, color, motor de outfits, store, IA). Aquí va lo testeable.
- `src/ui/`: una pantalla por fichero. `src/data/`: constantes y catálogos.
- `worker/`: `index.ts` (rutas `/api/*`) y `valida.ts` (validación de entrada).
- `test/`: un `*.test.ts` por módulo de `src/lib` o `worker`.

## Reglas del proyecto

- **Privacidad ante todo.** Los datos de la persona no salen del dispositivo. Nada de cuentas, analítica ni guardar nada en el Worker.
- La IA es opcional: cualquier envío de fotos a la IA pide permiso antes.
- Sin fuentes, scripts ni CDNs de terceros: todo se sirve desde la propia app.
- La clave de la IA es un secreto de Cloudflare (`IA_CLAVE`); nunca en el código ni en `wrangler.jsonc`.
- Textos de la interfaz y comentarios en español.
- No añadas dependencias sin preguntar.

## Comunicación

- Español informal, corto y al grano. Sin introducciones ni resúmenes finales.
- Al proponer código, solo el fragmento que cambia, salvo que pida el fichero entero.
- Si algo es ambiguo, pregunta antes de escribir mucho.

## Cómo trabajar

1. **Piensa antes de programar.** Di qué vas a hacer y qué supuestos asumes. Si hay dos interpretaciones razonables, pregunta.
2. **Lo más simple que funcione.** Nada de abstracciones u opciones que nadie ha pedido.
3. **Cambios quirúrgicos.** Toca solo lo necesario. No reformatees ni "mejores" código ajeno de paso; si ves algo, avísalo.
4. **Verifica.** `npm test`, `npm run typecheck` y `npm run build` en verde antes de decir que funciona; si es UI, compruébalo en `npm run dev`.

## Flujo

- Tarea compleja o de varios ficheros → `/plan` primero, o `/grill-me` si el diseño no está claro.
- Bug → primero un test que falle en `test/`, luego el arreglo.
- Después de cambios grandes: `/revisar` (bugs) y luego `/limpiar` (simplificar).
- Antes de abrir un PR: `/preparar-pr`.
- Una rama por cambio, PR a `main`, commits pequeños con mensaje en imperativo.

## Prohibido

- Commitear secretos o `.env`.
- Push directo a `main`.
- Borrar o debilitar tests para que pase la CI.
