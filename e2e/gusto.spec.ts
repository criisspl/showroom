import { test, expect } from "@playwright/test";
import { abreConArmario, pestana } from "./ayuda.ts";

// PNG de 1×1 inventado: no hace falta una foto real
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);
const foto = { name: "look.png", mimeType: "image/png", buffer: PNG };

test("guarda una referencia sin IA y la analiza solo tras dar permiso", async ({ page }) => {
  const envios: string[] = [];
  await page.route("**/api/ia", async (route) => {
    envios.push(route.request().postData() || "");
    await route.fulfill({
      json: {
        choices: [
          {
            message: {
              content: JSON.stringify({
                resumen: "Look minimal en tonos azules",
                esteticas: ["minimal"],
                registro: "arreglado",
                prendas: ["blazer"],
                detalles: ["cinturón fino"],
                colores: [{ n: "azul", hex: "#3B6EA5" }]
              })
            }
          }
        ]
      }
    });
  });
  await abreConArmario(page);
  await pestana(page, "Análisis");
  const gusto = page.getByRole("region", { name: "Referencias de gusto" });
  await gusto.locator('input[type="file"]').setInputFiles(foto);
  await expect(gusto.getByRole("button", { name: "Analizar" })).toBeVisible();
  expect(envios).toHaveLength(0);

  await gusto.getByRole("button", { name: "Analizar" }).click();
  await expect(gusto.getByRole("group", { name: "Permiso para enviar la foto" })).toBeVisible();
  expect(envios).toHaveLength(0);
  await gusto.getByRole("button", { name: "No" }).click();
  expect(envios).toHaveLength(0);

  await gusto.getByRole("button", { name: "Analizar" }).click();
  await gusto.getByRole("button", { name: "Sí, enviarla" }).click();
  await expect(gusto.getByText("Look minimal en tonos azules")).toBeVisible();
  await expect(gusto.getByRole("group", { name: "Lo que te gusta" })).toContainText("minimal");
  expect(envios).toHaveLength(1);
});

test("borrar una referencia pide confirmación", async ({ page }) => {
  await abreConArmario(page);
  await pestana(page, "Análisis");
  const gusto = page.getByRole("region", { name: "Referencias de gusto" });
  await gusto.locator('input[type="file"]').setInputFiles(foto);
  await gusto.getByRole("button", { name: "Borrar" }).click();
  await gusto.getByRole("button", { name: "¿Seguro?" }).click();
  await expect(gusto.getByRole("button", { name: "Borrar" })).toHaveCount(0);
});
