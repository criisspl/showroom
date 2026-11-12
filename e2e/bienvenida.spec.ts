import { test, expect } from "@playwright/test";
import { abre, pestana } from "./ayuda.ts";

test("crea el perfil a mano y lo recuerda al volver", async ({ page }) => {
  await abre(page);
  await expect(page.getByRole("heading", { name: "Armario" })).toBeVisible();
  await page.getByText("Ya sé mi estación y mi tipo de cuerpo").click();
  await page.getByLabel("Estación de color").selectOption({ label: "Verano Suave" });
  await page.getByLabel("Tipo de cuerpo (Kibbe)").selectOption({ label: "Clásico Suave" });
  await page.getByRole("button", { name: "Crear mi perfil" }).click();
  await page.locator("#tab-configuracion").getByRole("button", { name: "Guardar y continuar" }).click();

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
  await page.locator("#tab-configuracion").getByRole("button", { name: "Guardar y continuar" }).click();
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

test("tras la bienvenida sale la configuración inicial con lo sugerido y se puede elegir otra IA", async ({
  page
}) => {
  await abre(page);
  await page.getByText("Ya sé mi estación y mi tipo de cuerpo").click();
  await page.getByRole("button", { name: "Crear mi perfil" }).click();
  const config = page.locator("#tab-configuracion");
  await expect(config.getByLabel("Almacenamiento")).toHaveValue("indexeddb");
  await expect(config.getByLabel("Qué IA usar")).toHaveValue("integrada");
  await config.getByLabel("Qué IA usar").selectOption({ label: "Groq" });
  await config.getByLabel(/^Tu clave/).fill("gsk_inventada");
  await config.getByLabel("Contraseña de tu clave").fill("contraseña-larga");
  await config.getByRole("button", { name: "Guardar y continuar" }).click();
  await expect(page.locator("#tab-analisis")).toContainText("Estación");
});
