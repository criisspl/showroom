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
