# CLAUDE.md

Solo lo propio de este repo; las reglas generales y las skills (`/preparar-pr`, `/grill-me`; para revisar y limpiar, `/code-review` y `/simplify` de serie) vienen de [claude-config](https://github.com/criisspl/claude-config). Cada línea está aquí porque sin ella Claude se equivocaría; si una deja de hacer falta, bórrala.

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

<!-- claude-config:inicio · no edites este bloque: lo gestiona claude-config -->

## Reglas de los paquetes (claude-config v1.0.1)

### cloudflare-workers

- Secretos con `wrangler secret put <NOMBRE>`; en local, en `.dev.vars` (ignorado por git). Nunca en `vars` de `wrangler.jsonc` ni en el código: `vars` es texto visible.
- Los tipos de `env` salen de `wrangler types` (genera `worker-configuration.d.ts`; no se edita a mano). Vuelve a ejecutarlo cada vez que cambies bindings o la config.
- Mantén `compatibility_date` fija y explícita; no la subas sin probar con `wrangler dev`.
- Handler como módulo: `export default { async fetch(request, env, ctx) { ... } }`. Trabajo que no bloquea la respuesta, con `ctx.waitUntil()`.
- Valida toda entrada (método, cabeceras, cuerpo, tamaño) antes de usarla o reenviarla; en endpoints públicos o que gastan dinero, rate limiting binding con una clave estable (no la IP).
- Con `assets`, las rutas de API solo llegan al Worker si el asset no coincide o si las listas en `run_worker_first`.

### indexeddb

- Cada cambio de esquema es una versión nueva (`db.version(n+1).stores(...)`), con `.upgrade()` si hay que migrar datos. Una versión con `upgrade` ya publicada no se edita nunca.
- Dentro de una transacción no hagas `await` de nada ajeno a IndexedDB (`fetch`, `setTimeout`, crypto...): se auto-confirma. Haz primero lo asíncrono y abre la transacción después.
- Safari borra el almacenamiento tras 7 días de uso sin interacción con el sitio (salvo apps instaladas en pantalla de inicio): pide `navigator.storage.persist()` y ofrece copia de seguridad exportable.
- Tests con `fake-indexeddb` (importando `fake-indexeddb/auto`), con una base nueva por test.
- UI reactiva con Dexie: `liveQuery()`, no recargas a mano.

### playwright

- Localiza por lo que ve el usuario: `page.getByRole('button', { name: ... })`, `getByLabel`, `getByText`; `getByTestId` si no hay otra. Nada de selectores CSS/XPath frágiles.
- Aserciones web-first con auto-wait: `await expect(locator).toBeVisible()`. No uses `expect(await locator.isVisible())` ni `waitForTimeout`.
- Cada test es independiente: su propio estado, sin depender del orden ni de datos de otro test.
- No dependas de servicios externos: intercepta con `page.route` y responde con datos inventados.
- Un fallo se depura con `npx playwright test --debug` o el trace (`--trace on`), no añadiendo esperas.

### svelte

- Svelte 5 con runas, nada de sintaxis de Svelte 4 en código nuevo: `$state`, `$derived`, `$effect`, `$props`, `$bindable`; ni `export let`, ni `$:`, ni `<slot>`, ni `on:click`, ni `createEventDispatcher`.
- Estado derivado con `$derived` / `$derived.by`, nunca sincronizado con `$effect`. `$effect` es solo para salir de Svelte (DOM externo, librerías, red) y devuelve su limpieza.
- Eventos como atributos (`onclick={...}`) y comunicación hijo→padre con props de callback; contenido con snippets (`{#snippet}` / `{@render children?.()}`), no slots.
- Estado compartido entre ficheros en `.svelte.ts`: no exportes un `$state` que se reasigna; exporta un objeto y muta sus propiedades, o expón getters/setters.
- Componentes con `<script lang="ts">`, props tipadas con `interface Props` y `$props()`. Montar desde JS con `mount(App, { target, props })` (y `unmount`), nunca `new App()`.

### typescript

- Prohibido `any` (y `as any`, `@ts-ignore`): usa `unknown` y acota con comprobaciones, o un tipo del dominio. Si de verdad hace falta suprimir, `@ts-expect-error` con motivo.
- Con `verbatimModuleSyntax`, lo que solo es tipo se importa con `import type { X }` o `import { type X }`; si no, el typecheck falla.
- Con `allowImportingTsExtensions`, los imports relativos llevan la extensión `.ts` explícita (`./foo.ts`, no `./foo`).
- Para objetos de configuración o tablas usa `satisfies Tipo` en vez de anotar, para no perder los literales. Evita `as` para "arreglar" errores de tipos.
- No des un cambio por bueno sin pasar el typecheck del repo (`tsc --noEmit` o su script).

### vite

- Solo las variables `VITE_*` llegan al cliente y quedan incrustadas en el bundle: son públicas. Nunca pongas claves, tokens ni secretos en ellas; van en un backend/función serverless.
- Se leen con `import.meta.env.VITE_X` (no `process.env`) y son siempre strings; convierte booleanos y números a mano. Tipa las nuevas en `src/vite-env.d.ts` extendiendo `ImportMetaEnv`, sin `import` en ese fichero.
- La config vive en `vite.config.ts` con `defineConfig`. En Vite 8 `build.rollupOptions` pasó a `build.rolldownOptions` y `esbuild` a `oxc`; mira la versión instalada antes de tocarlas.
- `vite preview` solo sirve el build local para comprobarlo (ejecuta antes `vite build`); no es un servidor de producción.
- Los ficheros `.env*.local` van en `.gitignore`; tras cambiar un `.env` hay que reiniciar el dev server.

### vitest

- Es Vitest, no Jest: `vi.fn`, `vi.spyOn`, `vi.mock`, nunca `jest.*`. Importa `describe/it/expect/vi` de `vitest` salvo que `globals` esté activo.
- `vi.mock` se hoistea encima de los imports: si la factory necesita variables externas, créalas con `vi.hoisted`.
- Restaura lo que toques: `vi.useRealTimers()` tras `vi.useFakeTimers()`, `vi.unstubAllGlobals()`/`vi.unstubAllEnvs()` tras stubs, y `vi.restoreAllMocks()` de los spies.
- Prefiere aserciones precisas (`toEqual`, `toMatchObject`, `toThrow(...)`) a `toBeTruthy`; si el repo usa `node:assert/strict`, sigue ese estilo.

<!-- claude-config:fin -->
