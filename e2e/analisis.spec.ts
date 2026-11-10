import { test, expect } from "@playwright/test";
import { abreConArmario, pestana } from "./ayuda.ts";

test("muestra el análisis guardado: estación, cuerpo y paleta", async ({ page }) => {
  await abreConArmario(page);
  await pestana(page, "Análisis");
  const an = page.locator("#an-wrap");
  await expect(an.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(an).toContainText("Verano Suave");
  await expect(an).toContainText("Clásico Suave");
  await expect(an.getByRole("button", { name: "Guardar mi guía en PDF" })).toBeVisible();
});

test("«Inspo a la carta» cambia las búsquedas según estación y ocasión", async ({ page }) => {
  await abreConArmario(page);
  await pestana(page, "Análisis");
  const inspo = page.locator("#an-inspo");
  const outfits = inspo.getByRole("link", { name: /Outfits/ });
  const antes = await outfits.getAttribute("href");
  expect(antes).toContain("pinterest");

  await inspo.getByText("Invierno", { exact: true }).click();
  await inspo.getByText("Cita", { exact: false }).first().click();
  await expect(outfits).not.toHaveAttribute("href", antes ?? "");
  expect(decodeURIComponent((await outfits.getAttribute("href")) ?? "")).toMatch(/winter/);
  await expect(inspo.getByRole("link", { name: /Maquillaje/ })).toBeVisible();
});

test("desde el análisis se llega a Ajustes y se rehace el análisis", async ({ page }) => {
  await abreConArmario(page);
  await pestana(page, "Análisis");
  await page.getByRole("button", { name: "Ajustes" }).click();
  await expect(page.getByRole("heading", { name: "Ajustes", level: 1 })).toBeVisible();

  await pestana(page, "Análisis");
  await page.getByRole("button", { name: "Rehacer mi análisis" }).click();
  await expect(page.getByText("Ya sé mi estación y mi tipo de cuerpo")).toBeVisible();
});
