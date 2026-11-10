import { test, expect } from "@playwright/test";
import { abre, pestana } from "./ayuda.ts";

test("crea el perfil a mano y lo recuerda al volver", async ({ page }) => {
  await abre(page);
  await expect(page.getByRole("heading", { name: "Armario" })).toBeVisible();
  await page.getByText("Ya sé mi estación y mi tipo de cuerpo").click();
  await page.getByLabel("Estación de color").selectOption({ label: "Verano Suave" });
  await page.getByLabel("Tipo de cuerpo (Kibbe)").selectOption({ label: "Clásico Suave" });
  await page.getByRole("button", { name: "Crear mi perfil" }).click();

  const analisis = page.locator("#tab-analisis");
  await expect(analisis).toContainText("Verano Suave");
  await expect(analisis).toContainText("Clásico Suave");

  await page.reload();
  await pestana(page, "Análisis");
  await expect(analisis).toContainText("Verano Suave");
});

test("«Guardar mi guía en PDF» imprime solo el informe", async ({ page }) => {
  await abre(page);
  await page.getByText("Ya sé mi estación y mi tipo de cuerpo").click();
  await page.getByRole("button", { name: "Crear mi perfil" }).click();
  await page.evaluate(() => {
    (window as unknown as { impresiones: number }).impresiones = 0;
    window.print = () => {
      (window as unknown as { impresiones: number }).impresiones++;
    };
  });
  await page.getByRole("button", { name: "Guardar mi guía en PDF" }).click();
  expect(await page.evaluate(() => (window as unknown as { impresiones: number }).impresiones)).toBe(1);
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("#tab-analisis")).toBeVisible();
  await expect(page.getByRole("button", { name: "Guardar mi guía en PDF" })).toBeHidden();
  await expect(page.locator(".a-tabs")).toBeHidden();
});
