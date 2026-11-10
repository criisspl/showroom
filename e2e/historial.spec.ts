import { test, expect, type Page } from "@playwright/test";
import { abreConArmario, pestana } from "./ayuda.ts";

test("sin uso todavía enseña los estados vacíos y las altas del armario", async ({ page }) => {
  await abreConArmario(page);
  await pestana(page, "Historial");
  const h = page.locator("#tab-historial");
  await expect(h.getByRole("heading", { name: "Historial", level: 1 })).toBeVisible();
  await expect(h.locator("#a-usos")).toContainText("Cuando pulses «Me lo pongo hoy»");
  await expect(h.locator("#a-favs")).toContainText("Aquí se quedan los outfits que guardes");
  await expect(h.locator("#a-votos")).toContainText("Cuando valores un outfit");
  await expect(h.locator("#a-altas li").first()).toBeVisible();
});

async function ponerseUnLook(page: Page) {
  await pestana(page, "Hoy");
  await page.getByRole("button", { name: "Montar outfits" }).click();
  const look = page.locator("#a-out article.a-fit").first();
  await look.getByRole("button", { name: "Me lo pongo hoy" }).click();
  await expect(look.getByRole("button", { name: "Anotado en tu historial" })).toBeVisible();
  await look.getByRole("button", { name: "Sí", exact: true }).click();
  await expect(look).toContainText("Apuntado");
}

test("un outfit anotado se quita con doble pulsación", async ({ page }) => {
  await abreConArmario(page);
  await ponerseUnLook(page);
  await pestana(page, "Historial");
  const usos = page.locator("#a-usos");
  await expect(usos.locator("li.a-fit")).toHaveCount(1);
  await usos.getByRole("button", { name: "Quitar" }).click();
  await expect(usos.getByRole("button", { name: "Pulsa otra vez para quitar" })).toBeVisible();
  await expect(usos.locator("li.a-fit")).toHaveCount(1);
  await usos.getByRole("button", { name: "Pulsa otra vez para quitar" }).click();
  await expect(usos.locator("li.a-fit")).toHaveCount(0);
  await expect(page.locator("#a-stats")).toContainText(/0\s*outfit/);
});

test("lo aprendido de las valoraciones se puede borrar con doble pulsación", async ({ page }) => {
  await abreConArmario(page);
  await ponerseUnLook(page);
  await pestana(page, "Historial");
  const votos = page.locator("#a-votos");
  await expect(votos).toContainText(/1\s*outfit valorado/);
  await votos.getByRole("button", { name: "Borrar valoraciones" }).click();
  await votos.getByRole("button", { name: "Pulsa otra vez para borrarlas todas" }).click();
  await expect(votos).toContainText("Cuando valores un outfit");
});
