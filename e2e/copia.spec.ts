import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { abreConArmario, pestana } from "./ayuda.ts";

test("la copia se descarga sin la clave de la IA, se borra todo y se recupera", async ({ page }) => {
  await abreConArmario(page);
  await pestana(page, "Análisis");
  await page.getByRole("button", { name: "Ajustes" }).click();
  await page.getByLabel("Qué IA usar").selectOption({ label: "Groq" });
  await page.getByLabel("Tu clave").fill("gsk_secreta");
  await page.locator("#s-guarda").click();
  await expect(page.locator("#s-msg")).toHaveText("Guardado.");

  const [descarga] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Descargar copia" }).click()
  ]);
  expect(descarga.suggestedFilename()).toMatch(/^copia-\d{4}-\d{2}-\d{2}\.armario\.json$/);
  const ruta = test.info().outputPath("copia.json");
  await descarga.saveAs(ruta);
  const copia = JSON.parse(fs.readFileSync(ruta, "utf8"));
  expect(copia.app).toBe("armario");
  expect(copia.prendas).toHaveLength(11);
  expect(copia.kv.ajustes).toMatchObject({ proveedor: "groq", clave: "" });

  await page.getByRole("button", { name: "Borrar todo" }).click();
  await page.getByRole("button", { name: "Pulsa otra vez: se borra todo" }).click();
  await expect(page.getByText("Ya sé mi estación y mi tipo de cuerpo")).toBeVisible();

  await page.locator("#b-importa").setInputFiles(ruta);
  await pestana(page, "Armario");
  await expect(page.locator("#a-grid").getByRole("button")).toHaveCount(11);
});
