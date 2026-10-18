---
name: playwright
description: Use when writing, fixing or reviewing end-to-end tests in a project that uses Playwright Test (@playwright/test), including locators, assertions and flaky-test debugging.
---

# Playwright Test

## Convenciones
- Locators por lo que ve el usuario, en este orden: `getByRole`, `getByLabel`, `getByText`, `getByPlaceholder`, y `getByTestId` como último recurso.
- Los locators se evalúan al actuar y reintentan solos; las acciones esperan a que el elemento sea accionable.
- Aserciones web-first: `await expect(locator)...` espera y reintenta hasta el timeout.
- Tests independientes: cada uno con su estado; setup compartido en `beforeEach` o en un proyecto de setup.
- Nada de servicios externos: `page.route` para responder con datos inventados.

## Errores típicos de LLM
- `page.waitForTimeout(...)`: esperas fijas que hacen el test lento y frágil. Espera a una condición con `expect`.
- `expect(await loc.isVisible()).toBe(true)`: no espera. Usa `await expect(loc).toBeVisible()`.
- Selectores CSS por clase o XPath que se rompen con cualquier cambio de DOM.
- Olvidar `await` delante de `expect(locator)`/acciones.
- Arreglar un test inestable con `.first()`/`.nth()`: ocultan el problema (saltan la comprobación de strictness). Mejor acota con `filter`.
- Un locator que casa con varios elementos lanza error en acciones (strict mode): hay que afinarlo.

## Patrones
```ts
import { test, expect } from "@playwright/test";

test("guarda una prenda", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Añadir prenda" }).click();
  await page.getByLabel("Nombre").fill("Camisa azul");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Camisa azul")).toBeVisible();
});
```

Acotar con filter:
```ts
const fila = page.getByRole("listitem").filter({ hasText: "Camisa azul" });
await fila.getByRole("button", { name: "Borrar" }).click();
await expect(fila).toHaveCount(0);
```

Interceptar red:
```ts
await page.route("**/api/analiza", (route) =>
  route.fulfill({ json: { ok: true } }),
);
```

`getByText` acepta substring, `{ exact: true }` o regex; `getByRole` acepta `name` como string o regex.

## Depurar
```sh
npx playwright test --debug
npx playwright test fichero.spec.ts:9 --debug
npx playwright test --trace on
npx playwright show-report
```
En CI, el trace en el primer reintento es más útil que vídeo o capturas.

## Verificar
```sh
npx playwright test            # o el script `e2e` del repo
```
Si el e2e corre contra la app compilada, haz build antes.

## Fuentes
- https://playwright.dev/docs/best-practices
- https://playwright.dev/docs/locators
