import { test, expect } from "@playwright/test";
import { abreConArmario, pestana } from "./ayuda.ts";

test("propone tres looks con prendas del armario", async ({ page }) => {
  await abreConArmario(page);
  await pestana(page, "Hoy");
  await page.getByRole("button", { name: "Montar outfits" }).click();
  const looks = page.locator("#a-out article.a-fit");
  await expect(looks).toHaveCount(3);
  await expect(looks.first()).toContainText(/Opción 1/i);
});

test("lo que te pones y lo que valoras queda en el historial", async ({ page }) => {
  await abreConArmario(page);
  await pestana(page, "Hoy");
  await page.getByRole("button", { name: "Montar outfits" }).click();
  const look = page.locator("#a-out article.a-fit").first();
  await look.getByRole("button", { name: "Me lo pongo hoy" }).click();
  await expect(look.getByRole("button", { name: "Anotado en tu historial" })).toBeVisible();
  await look.getByRole("button", { name: "Sí", exact: true }).click();
  await expect(look).toContainText("Apuntado: buscaré más como este.");

  await pestana(page, "Historial");
  const historial = page.locator("#tab-historial");
  await expect(historial.locator("#a-stats")).toContainText(/1\s*outfit anotado/);
  await expect(historial.locator("#a-votos")).toContainText(/1\s*outfit valorado/);
});

test("«Lo monto yo» juzga un look elegido a mano", async ({ page }) => {
  await abreConArmario(page);
  await pestana(page, "Hoy");
  await page.getByRole("radiogroup", { name: "Modo" }).getByText("Lo monto yo").click();
  const elige = page.locator("#a-yo-pick");
  await elige.getByText("Blusa fluida azul grisáceo").click();
  await elige.getByText("Pantalón de pinzas marino").click();
  await elige.getByText("Botines de ante gris").click();
  await page.getByRole("button", { name: "¿Pega? (3 prendas)" }).click();
  await expect(page.locator("#a-yo-out")).toContainText(/¡Pega!|Pega, con algún retoque|No pega/);
});

test("«Lo monto yo» trae el espejo de 30 segundos", async ({ page }) => {
  await abreConArmario(page);
  await pestana(page, "Hoy");
  await expect(page.getByRole("region", { name: "Espejo, 30 segundos" })).toBeHidden();
  await page.getByRole("radiogroup", { name: "Modo" }).getByText("Lo monto yo").click();
  const espejo = page.getByRole("region", { name: "Espejo, 30 segundos" });
  await expect(espejo.getByRole("checkbox")).toHaveCount(5);
  await expect(espejo).toContainText("Marca lo que cumple el look.");
  for (const caja of await espejo.getByRole("checkbox").all()) await caja.check();
  await expect(espejo).toContainText("5/5");
  await expect(espejo).toContainText("Listo. Sal por la puerta.");
  await espejo.getByRole("button", { name: "Otro look" }).click();
  await expect(espejo).toContainText("0/5");
});

test("cada look despliega el maquillaje para esa ropa", async ({ page }) => {
  await abreConArmario(page);
  await pestana(page, "Hoy");
  await page.getByRole("button", { name: "Montar outfits" }).click();
  const look = page.locator("#a-out article.a-fit").first();
  const boton = look.getByRole("button", { name: "Maquillaje para este look" });
  await expect(boton).toHaveAttribute("aria-expanded", "false");
  await boton.click();
  await expect(boton).toHaveAttribute("aria-expanded", "true");
  await expect(look.getByText("Piel", { exact: true })).toBeVisible();
  await expect(look.getByText("Estación", { exact: true })).toBeVisible();
  await expect(look.getByRole("link", { name: /Versión élfica/ })).toBeVisible();
  await boton.click();
  await expect(look.getByText("Piel", { exact: true })).toBeHidden();
});
