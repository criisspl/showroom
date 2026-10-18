---
name: typescript
description: Use when writing or reviewing TypeScript code or tsconfig in a project that uses TypeScript (5.x–6), especially with strict mode, verbatimModuleSyntax or allowImportingTsExtensions.
---

# TypeScript

## Convenciones
- `strict: true`. Sin `any`: usa `unknown` en bordes (JSON, `catch`, respuestas) y acótalo antes de usarlo.
- Los tipos del dominio viven en un sitio (p. ej. `tipos.ts`); no los redeclares por fichero.
- `satisfies` valida sin ensanchar el tipo; la anotación sí ensancha.
- Preferir uniones discriminadas y `switch` exhaustivo antes que flags opcionales.

## Errores típicos de LLM
- Importar tipos como valores. Con `verbatimModuleSyntax` todo import sin `type` se conserva tal cual en la salida, así que un tipo sin `type` da error.
- Olvidar la extensión en imports relativos cuando el proyecto usa `allowImportingTsExtensions` (`./foo.ts`).
- Silenciar errores con `as any`, `as unknown as X` o `@ts-ignore` en vez de arreglar el tipo.
- Anotar una tabla de configuración y perder los literales (ver `satisfies`).
- `catch (e)` y usar `e.message` sin comprobar: `e` es `unknown` (con `useUnknownInCatchVariables`, incluido en `strict`).

## Patrones

Imports de solo tipo (cualquiera de las dos formas):
```ts
import type { Prenda } from "./tipos.ts";
import { calcular, type Resultado } from "./calculo.ts";
```
Con `import { type X } from "m"` el import de `m` se queda como efecto lateral; si no lo quieres, usa `import type`.

`satisfies`:
```ts
const paleta = {
  rojo: [255, 0, 0],
  verde: "#00ff00",
} satisfies Record<string, string | [number, number, number]>;
paleta.verde.toUpperCase(); // sigue siendo string
```

Estrechar `unknown`:
```ts
function mensaje(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
```

Exhaustividad:
```ts
function f(x: "a" | "b") {
  switch (x) {
    case "a": return 1;
    case "b": return 2;
    default: { const _: never = x; return _; }
  }
}
```

## tsconfig
- `allowImportingTsExtensions` solo se puede usar junto a `noEmit` o `emitDeclarationOnly` (el JS emitido no puede llevar imports `.ts`). Es lo normal si el bundler (Vite) compila.
- `verbatimModuleSyntax` y `noEmit` conviven: el typecheck sigue exigiendo `type` donde toca.

## Verificar
```sh
npx tsc --noEmit        # o el script `typecheck` del repo
npm run lint            # typescript-eslint, si está
```
Si el repo tiene `typecheck` en `package.json`, usa ese.

## Fuentes
- https://www.typescriptlang.org/tsconfig/verbatimModuleSyntax.html
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html (`satisfies`)
- https://www.typescriptlang.org/tsconfig/
