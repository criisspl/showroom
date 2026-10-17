# CLAUDE.md

Solo lo propio de este repo; las reglas generales y las skills (`/revisar`, `/limpiar`, `/preparar-pr`, `/grill-me`) vienen de [claude-config](https://github.com/criisspl/claude-config). Cada línea está aquí porque sin ella Claude se equivocaría; si una deja de hacer falta, bórrala.

## Stack y comandos

- TypeScript estricto en `src/lib/`, `src/data/` y `worker/`. Vite, Node 22.
- Interfaz pasando de JS a Svelte 5 pantalla a pantalla: las nuevas son `src/ui/<Pantalla>.svelte` (solo runas, `lang="ts"`) y su lógica va a `src/lib/<pantalla>.ts` con tests. Mientras convivan, el estado del motor no es reactivo: main.js avisa con `repinta()` y `src/ui/puente.svelte.ts` hace que las pantallas Svelte se recalculen.
- TypeScript fijado en 6.0: typescript-eslint todavía no admite la 7. ESLint revisa también los `.ts`.
- Imports con extensión `.ts` explícita (`allowImportingTsExtensions`). Tipos del dominio en `src/lib/tipos.ts`.
- Backend: Cloudflare Worker (`worker/`) que solo hace de intermediario con la IA; config en `wrangler.jsonc`.
- Datos: IndexedDB en el navegador es la fuente de verdad (`src/lib/store.ts`); copia en la nube opcional y cifrada en el dispositivo (ver `docs/adr/0001-local-first-copia-cifrada.md`).
- Tests: Vitest + `node:assert/strict`, con `fake-indexeddb` para el store. E2E: Playwright en `e2e/`, contra la app compilada; el armario de prueba (`e2e/datos/`) es inventado.

| Qué            | Comando                                  |
| -------------- | ---------------------------------------- |
| Instalar       | `npm ci`                                 |
| Dev (solo web) | `npm run dev`                            |
| Dev con API    | `npm run dev:api`                        |
| Tests          | `npm test`                               |
| Tipos          | `npm run typecheck` (tsc + svelte-check) |
| E2E            | `npm run e2e`                            |
| Lint y formato | `npm run lint` · `npm run format`        |
| Build          | `npm run build`                          |

CI (`.github/workflows/ci.yml`) ejecuta lint, formato, tipos, tests con cobertura mínima, build y e2e: todo tiene que pasar antes de dar algo por hecho. Los commits siguen Conventional Commits (commitlint).

## Estructura

- `src/lib/`: lógica sin DOM (análisis, color, motor de outfits, store, IA). Aquí va lo testeable.
- `src/lib/motor/`: el motor de outfits por partes; la interfaz importa siempre de `engine.ts`, que lo reexporta.
- `src/ui/`: una pantalla por fichero. `src/data/`: constantes y catálogos.
- `worker/`: `index.ts` (rutas `/api/*`) y `valida.ts` (validación de entrada).
- `test/`: un `*.test.ts` por módulo de `src/lib` o `worker`.
- `docs/adr/`: decisiones de arquitectura (una por fichero).

## Reglas del proyecto

- **Privacidad ante todo.** Los datos de la persona viven en su dispositivo. La copia en la nube es opcional y solo guarda blobs cifrados en el dispositivo: el servidor nunca ve datos en claro. Nada de analítica ni guardar nada en el Worker.
- La IA es opcional: cualquier envío de fotos a la IA pide permiso antes.
- Sin fuentes, scripts ni CDNs de terceros: todo se sirve desde la propia app.
- La clave de la IA es un secreto de Cloudflare (`IA_CLAVE`); nunca en el código ni en `wrangler.jsonc`.
- Textos de la interfaz y comentarios en español.
- No añadas dependencias sin preguntar.
- No cambies sin migración el formato de lo guardado en IndexedDB ni el de las copias `.armario.json`: rompería los datos de quien ya usa la app.
- En revisiones, cualquier dato que salga del dispositivo sin cifrar o sin permiso es un bug de gravedad alta.
- Bug → el test que falla va en `test/` (o en `e2e/` si solo se ve en la app compilada).
