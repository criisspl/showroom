import { test, expect } from "@playwright/test";
import { abreConArmario, pestana } from "./ayuda.ts";

async function irAAjustes(page: import("@playwright/test").Page) {
  await abreConArmario(page);
  await pestana(page, "Análisis");
  await page.getByRole("button", { name: "Ajustes" }).click();
  await expect(page.getByRole("heading", { name: "Ajustes", level: 1 })).toBeVisible();
}

test("al cambiar de proveedor se ajustan la nota, la clave y la URL propia", async ({ page }) => {
  await irAAjustes(page);
  const prov = page.getByLabel("Qué IA usar");
  await expect(page.locator("#s-prov-nota")).toContainText("la app ya trae la IA");
  await expect(page.getByLabel("Tu clave")).toBeHidden();

  await prov.selectOption({ label: "Groq" });
  await expect(page.locator("#s-prov-nota")).toContainText("muy rápido");
  await expect(page.getByLabel("Tu clave")).toBeVisible();
  await expect(page.getByLabel("URL de la API")).toBeHidden();

  await prov.selectOption({ label: "Otro compatible con OpenAI" });
  await expect(page.getByLabel("URL de la API")).toBeVisible();
});

test("guardar avisa si falta la clave y conserva lo guardado tras recargar sección", async ({ page }) => {
  await irAAjustes(page);
  await page.getByLabel("Qué IA usar").selectOption({ label: "Groq" });
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.locator("#s-msg")).toHaveText("Sin clave se usa la IA de la app.");

  await page.getByLabel("Tu clave").fill("gsk_inventada");
  await page.getByLabel("Modelo").fill("modelo-inventado");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.locator("#s-msg")).toHaveText("Guardado.");

  await pestana(page, "Hoy");
  await pestana(page, "Análisis");
  await page.getByRole("button", { name: "Ajustes" }).click();
  await expect(page.getByLabel("Qué IA usar")).toHaveValue("groq");
  await expect(page.getByLabel("Modelo")).toHaveValue("modelo-inventado");
});

test("probar la conexión dice si funciona o por qué falla", async ({ page }) => {
  let status = 200;
  await page.route("**/api/ia", (route) =>
    status === 200
      ? route.fulfill({ json: { choices: [{ message: { content: "ok" } }] } })
      : route.fulfill({ status, json: { error: "x" } })
  );
  await irAAjustes(page);
  await page.getByRole("button", { name: "Probar conexión" }).click();
  await expect(page.locator("#s-msg")).toContainText("Conexión correcta");

  status = 429;
  await page.getByRole("button", { name: "Probar conexión" }).click();
  await expect(page.locator("#s-msg")).toContainText("límite gratuito");
});

test("borrar todo pide una segunda pulsación y «Rehacer mi análisis» vuelve a la bienvenida", async ({
  page
}) => {
  await irAAjustes(page);
  await page.getByRole("button", { name: "Rehacer mi análisis" }).click();
  await expect(page.getByText("Ya sé mi estación y mi tipo de cuerpo")).toBeVisible();
});
