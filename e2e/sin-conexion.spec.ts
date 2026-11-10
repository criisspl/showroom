import { test, expect } from "@playwright/test";
import { abreConArmario, pestana } from "./ayuda.ts";

test("funciona sin conexión una vez cargada", async ({ page, context }, info) => {
  test.fixme(
    info.project.name === "iphone",
    "En WebKit el service worker está bloqueado en este proyecto (ver playwright.config.ts) y Playwright no soporta bien setOffline + reload"
  );
  await abreConArmario(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // la segunda carga ya pasa por el service worker
  await context.setOffline(true);
  await page.reload();
  await pestana(page, "Armario");
  await expect(page.locator("#a-grid").getByRole("button")).toHaveCount(11);
});
