import { readFileSync, writeFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { COPIA, abre, abreConArmario, pestana } from "./ayuda.ts";

test("añade, edita y elimina una prenda", async ({ page }) => {
  await abreConArmario(page);
  await pestana(page, "Armario");
  const grid = page.locator("#a-grid");
  await expect(grid.getByRole("button")).toHaveCount(11);

  await page.getByRole("button", { name: "Añadir prenda" }).click();
  const form = page.locator("#a-form");
  await form.getByLabel("Nombre").fill("Falda plisada salvia");
  await form.getByRole("group", { name: "Categoría" }).getByText("Abajo").click();
  await form.getByLabel("Color principal").fill("#9caf88");
  await form.getByRole("button", { name: "Guardar" }).click();

  const nueva = grid.getByRole("button", { name: /Falda plisada salvia/ });
  await expect(nueva).toContainText("sin estrenar");
  await expect(grid.getByRole("button")).toHaveCount(12);

  await nueva.click();
  await form.getByLabel("Nombre").fill("Falda plisada verde");
  await form.getByRole("button", { name: "Guardar" }).click();
  await expect(grid.getByRole("button", { name: /Falda plisada verde/ })).toBeVisible();

  await grid.getByRole("button", { name: /Falda plisada verde/ }).click();
  await form.getByRole("button", { name: "Eliminar" }).click();
  await form.getByRole("button", { name: "Pulsa otra vez para eliminar" }).click();
  await expect(grid.getByRole("button", { name: /Falda plisada/ })).toHaveCount(0);
  await expect(grid.getByRole("button")).toHaveCount(11);
});

test("no guarda una prenda sin nombre", async ({ page }) => {
  await abreConArmario(page);
  await pestana(page, "Armario");
  await page.getByRole("button", { name: "Añadir prenda" }).click();
  await page.locator("#a-form").getByRole("button", { name: "Guardar" }).click();
  await expect(page.locator("#a-form-msg")).toHaveText("Ponle un nombre para reconocerla después.");
});

test("¿Lo compro? da un veredicto sin guardar la prenda", async ({ page }) => {
  await abreConArmario(page);
  await pestana(page, "Armario");
  await page.getByRole("button", { name: "¿Lo compro?" }).click();
  await expect(page.getByRole("heading", { name: "Deseos" })).toBeVisible();
  const form = page.locator("#a-form");
  await form.getByLabel("Tipo").fill("blusa");
  await form.getByLabel("Color principal").fill("#7a8fa6");
  await form.getByRole("button", { name: "Analizar" }).click();
  await expect(page.locator("#a-verd")).toContainText(/Cómprala|Piénsatelo|Mejor no/);
  await form.getByRole("button", { name: "Cancelar" }).click();
  await pestana(page, "Armario");
  await expect(page.locator("#a-grid").getByRole("button")).toHaveCount(11);
});

test("una prenda de Layering se guarda con temporada de otoño e invierno", async ({ page }) => {
  await abreConArmario(page);
  await pestana(page, "Armario");
  await page.getByRole("button", { name: "Añadir prenda" }).click();
  const form = page.locator("#a-form");
  await form.getByLabel("Nombre").fill("Jersey fino de cuello alto");
  await form.getByRole("group", { name: "Categoría" }).getByText("Layering").click();
  const temporada = form.getByRole("group", { name: "Temporada" });
  await expect(temporada.getByLabel("Otoño")).toBeChecked();
  await expect(temporada.getByLabel("Invierno")).toBeChecked();
  await expect(temporada.getByLabel("Verano")).not.toBeChecked();
  await form.getByRole("button", { name: "Guardar" }).click();

  await page.locator("#a-filter").getByText("Layering").click();
  await expect(
    page.locator("#a-grid").getByRole("button", { name: /Jersey fino de cuello alto/ })
  ).toBeVisible();
});

test("una prenda deducida de una foto de look sale con «Revisar» hasta que la guardas", async ({
  page
}, info) => {
  const copia = JSON.parse(readFileSync(COPIA, "utf8"));
  const prenda = copia.prendas[0];
  Object.assign(prenda, { origen: "foto-look", foto: null, mini: null });
  const ruta = info.outputPath("copia-con-foto-look.json");
  writeFileSync(ruta, JSON.stringify(copia));
  await abre(page);
  await page.locator("#b-importa").setInputFiles(ruta);
  await pestana(page, "Armario");
  const grid = page.locator("#a-grid");
  const item = grid.getByRole("button", { name: new RegExp(prenda.nombre) });
  await expect(item).toContainText("Revisar");
  await item.click();
  await page.locator("#a-form").getByRole("button", { name: "Guardar" }).click();
  await expect(grid.getByRole("button", { name: new RegExp(prenda.nombre) })).not.toContainText("Revisar");
});
