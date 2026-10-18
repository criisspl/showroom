---
name: vite
description: Use when configuring, building or reviewing a project that uses Vite 6-8, including env variables, vite.config.ts and build or preview issues.
---

# Vite 6–8

## Variables de entorno

- `import.meta.env` trae `MODE`, `BASE_URL`, `PROD`, `DEV`, `SSR`. No existe `process.env` en cliente.
- Solo llegan al cliente las que empiezan por `VITE_` (configurable con `envPrefix`). Se sustituyen en build: **son públicas**. Nada de claves de API ni tokens; eso va en un backend o función serverless.
- Siempre son strings: `import.meta.env.VITE_ACTIVO === 'true'`, `Number(...)`.
- Ficheros: `.env`, `.env.local`, `.env.[mode]`, `.env.[mode].local`. El modo específico gana al genérico; las variables ya definidas en el shell ganan a todo. `*.local` al `.gitignore`. Reinicia el dev server tras editarlos.
- `--mode staging` carga `.env.staging`. Modo y `NODE_ENV` son cosas distintas.

Tipado en `src/vite-env.d.ts` (sin `import`/`export` en el fichero, o la ampliación deja de funcionar):

```ts
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

## vite.config.ts

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
  server: { port: 5173 },
});
```

- Config en TypeScript; `defineConfig` para tener tipos.
- Prefiere `defineConfig(({ mode }) => ...)` si la config depende del modo; `loadEnv` para leer `.env` dentro de la config.

## Vite 8: cambios que los LLM no conocen

- Vite 8 usa Rolldown y Oxc en lugar de Rollup y esbuild; Lightning CSS minifica el CSS.
- `build.rollupOptions` → `build.rolldownOptions`; `worker.rollupOptions` → `worker.rolldownOptions`; `esbuild` → `oxc` (de momento se convierten solos).
- `output.manualChunks` en forma de objeto ya no existe; la forma función está deprecada.
- `build.target` por defecto sube (Chrome/Edge 111, Firefox 114, Safari 16.4).
- Minificar con esbuild vuelve con `build.minify: 'esbuild'` instalando `esbuild`.
- Si migras desde v6, lee primero la guía de migración de v7. Mira siempre la versión instalada antes de escribir opciones.

## Comandos

- `vite` dev, `vite build`, `vite preview`. `--host` y `--port` son de dev y preview, no de build.
- `vite preview` sirve `dist` para comprobar el build en local. No es un servidor de producción; ejecuta `vite build` antes.
- El dev server no es igual que el build: lo que funciona en dev puede fallar en `build`/`preview` (rutas con `base`, imports dinámicos, variables). Comprueba con preview antes de dar algo por hecho.

## Verificar

```bash
npm run build
npm run preview   # abrir en el navegador y comprobar
npx tsc --noEmit
```

## Fuentes

- https://vite.dev/guide/env-and-mode
- https://vite.dev/guide/migration
- https://vite.dev/guide/cli
