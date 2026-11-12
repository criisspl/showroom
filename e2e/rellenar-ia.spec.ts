import { test, expect } from "@playwright/test";
import { abreConArmario, pestana } from "./ayuda.ts";

// PNG de 1×1 inventado: no hace falta una foto real
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

const MOTIVO_WEBKIT =
  "WebKit de Playwright (contexto efímero) falla al guardar Blobs en IndexedDB: «Error preparing Blob/File data to be stored in object store». Safari real los guarda bien";

test("rellenar con IA no envía la foto hasta aceptar el aviso", async ({ page }, info) => {
  test.fixme(info.project.name === "iphone", MOTIVO_WEBKIT);
  const envios: string[] = [];
  await page.route("**/api/ia", async (route) => {
    envios.push(route.request().postData() || "");
    await route.fulfill({
      json: {
        choices: [
          { message: { content: JSON.stringify({ nombre: "Camisa de lino inventada", cat: "arriba" }) } }
        ]
      }
    });
  });
  await abreConArmario(page);
  await pestana(page, "Armario");
  await page.getByRole("button", { name: "Añadir prenda" }).click();
  const form = page.locator("#a-form");
  await form.locator("#a-file").setInputFiles({ name: "prenda.png", mimeType: "image/png", buffer: PNG });
  const rellenar = form.getByRole("button", { name: /Rellenar con IA/ });
  await expect(rellenar).toBeVisible();

  await rellenar.click();
  const aviso = form.getByRole("group", { name: "Permiso para enviar a la IA" });
  await expect(aviso).toBeVisible();
  await expect(aviso).toContainText("nada de tu armario ni de tu perfil");
  await expect(aviso.getByRole("button", { name: "Sí, enviarlo" })).toBeFocused();
  expect(envios).toHaveLength(0);

  await aviso.getByRole("button", { name: "No" }).click();
  await expect(aviso).toBeHidden();
  await expect(rellenar).toBeFocused();
  expect(envios).toHaveLength(0);

  await rellenar.click();
  await aviso.getByRole("button", { name: "Sí, enviarlo" }).click();
  await expect(form.getByLabel("Nombre")).toHaveValue("Camisa de lino inventada");
  expect(envios).toHaveLength(1);
});
