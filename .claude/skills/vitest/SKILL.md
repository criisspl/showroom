---
name: vitest
description: Use when writing, fixing or reviewing tests in a project that uses Vitest (3–5), including mocks, fake timers and migration from Jest.
---

# Vitest

## Convenciones
- `import { describe, it, expect, vi } from "vitest"` (salvo `globals: true`).
- Un test, un comportamiento; nombre que diga qué se espera.
- Bug: primero el test que falla. Nunca borrar ni debilitar tests para pasar la CI.
- Si el repo ya usa `node:assert/strict`, sigue ese estilo: también vale con Vitest.
- Aserciones precisas: `toEqual` (estructura), `toMatchObject` (subconjunto), `toThrow("msg")`, `toHaveBeenCalledWith(...)`.

## Errores típicos de LLM
- Usar `jest.fn()`, `jest.mock()`, `jest.useFakeTimers()`: aquí es `vi.*`.
- Referenciar variables externas dentro de la factory de `vi.mock`: la llamada se hoistea encima de los imports y falla. Usa `vi.hoisted`.
- `vi.mock` solo afecta a `import`, no a `require()`.
- Mockear una función que otra del mismo módulo llama internamente: el mock solo aplica a accesos externos.
- Dejar timers falsos, globals o env stubbeados entre tests.
- `vi.advanceTimersByTime` no resuelve timers asíncronos: usa `vi.advanceTimersByTimeAsync`.

## Patrones

Mock de módulo, parcial:
```ts
vi.mock("./api.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api.ts")>()),
  pedir: vi.fn(),
}));
```

Variables en la factory:
```ts
const { pedir } = vi.hoisted(() => ({ pedir: vi.fn() }));
vi.mock("./api.ts", () => ({ pedir }));
```

Fake timers:
```ts
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

it("reintenta a los 1000 ms", () => {
  const fn = vi.fn();
  setTimeout(fn, 1000);
  vi.advanceTimersByTime(1000);
  expect(fn).toHaveBeenCalledOnce();
});
```
`vi.useFakeTimers` también falsea `Date`; `vi.setSystemTime(...)` fija la hora (no se resetea sola).

Globals y entorno:
```ts
vi.stubGlobal("fetch", vi.fn());
vi.stubEnv("MODO", "test");
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
```
También existen las opciones de config `unstubGlobals` y `unstubEnvs`.

Spy: `const s = vi.spyOn(obj, "metodo").mockReturnValue(1);` y `vi.restoreAllMocks()` para devolver el original.

## Verificar
```sh
npx vitest run                 # una pasada, sin watch
npx vitest run ruta/fichero.test.ts
npx vitest run --coverage      # si hay umbral de cobertura
```
Usa el script `test` del repo si existe.

## Fuentes
- https://vitest.dev/api/vi.html
- https://vitest.dev/guide/mocking.html
