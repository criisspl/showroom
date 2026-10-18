---
name: cloudflare-workers
description: Use when writing or reviewing Worker code or wrangler configuration in a project that uses Cloudflare Workers (wrangler 4).
---

# Cloudflare Workers (wrangler 4)

## Config (`wrangler.jsonc`)
- `name`, `main` y `compatibility_date` (formato `yyyy-mm-dd`). Fija la fecha a propósito; cambiarla cambia el runtime.
- `vars` es texto visible: nada sensible. Los `vars` no se heredan en entornos con nombre.
- `observability.enabled` para tener logs persistidos.

```jsonc
{
  "name": "mi-worker",
  "main": "worker/index.ts",
  "compatibility_date": "2026-10-01",
  "assets": { "directory": "./dist", "binding": "ASSETS", "run_worker_first": ["/api/*"] },
  "ratelimits": [{ "name": "LIMITADOR", "namespace_id": "1001", "simple": { "limit": 20, "period": 60 } }]
}
```

## Secretos
- Producción: `wrangler secret put NOMBRE` (despliega al momento; con despliegues graduales, `wrangler versions secret put`).
- Local: `.dev.vars` junto a la config (dotenv). Usa `.dev.vars` o `.env`, no ambos. Añade `.dev.vars*` y `.env*` al `.gitignore`.
- Nunca en `vars`, en el código ni en el repo.
- Se leen desde `env.NOMBRE` (o `import { env } from 'cloudflare:workers'`).

## Tipos
- `wrangler types` genera `worker-configuration.d.ts` (Env + tipos del runtime). No se edita a mano; se regenera tras cambiar la config.
- Añádelo a `compilerOptions.types` del tsconfig. En CI vale `wrangler types --check`.
- Tipos propios del entorno: fusión de declaraciones sobre `Cloudflare.Env`.

## Handler
```ts
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) {
      if (request.method !== 'POST') return new Response('Método no permitido', { status: 405 })
      const { success } = await env.LIMITADOR.limit({ key: 'api' }) // clave estable, no la IP
      if (!success) return new Response('Demasiadas peticiones', { status: 429 })
      // validar cuerpo antes de usarlo
    }
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
```

## Assets
- Por defecto, si el asset coincide, se sirve sin ejecutar el Worker. `run_worker_first` acepta `true` o una lista de patrones (`*`, `!` para excluir; máx. 100).
- `env.ASSETS.fetch(request)` aplica `html_handling` y `not_found_handling` (p. ej. `single-page-application`).
- `binding` solo importa si hay `main`.

## Rate limiting
- Binding `ratelimits` (wrangler 4.36+). `period` solo puede ser 10 o 60; `limit()` recibe `{ key }`.
- Es por ubicación y eventualmente consistente: sirve para frenar abuso, no para contar con exactitud.
- `namespace_id` compartido comparte contadores.

## Límites
- CPU por petición: 10 ms en Free; en Paid 30 s por defecto (hasta 5 min con `limits.cpu_ms`). La espera de red no cuenta.
- Subrequests: 50 (Free) / 10.000 (Paid). Memoria: 128 MB por isolate: usa streams, no cargues cuerpos enormes.

## Errores típicos de LLM
- Meter la API key en `vars` o en el código.
- Usar sintaxis antigua (`addEventListener('fetch')`) en vez de módulo con `export default`.
- Escribir `Env` a mano en lugar de `wrangler types`.
- Confiar en el cuerpo/cabeceras sin validar, o reenviarlos tal cual a un tercero.
- Olvidar que `run_worker_first` por defecto es `false` y la ruta de API nunca llega al Worker.
- Limitar por IP.

## Verificar
- `wrangler types` y el typecheck del proyecto.
- `wrangler dev` y probar las rutas (incluida una entrada inválida).
- `wrangler deploy --dry-run` antes de `wrangler deploy`.
- Revisar que ningún secreto aparece en `git diff` ni en `wrangler.jsonc`.

## Fuentes
- https://developers.cloudflare.com/workers/wrangler/configuration/
- https://developers.cloudflare.com/workers/configuration/secrets/
- https://developers.cloudflare.com/workers/languages/typescript/
- https://developers.cloudflare.com/workers/static-assets/binding/
- https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- https://developers.cloudflare.com/workers/platform/limits/
