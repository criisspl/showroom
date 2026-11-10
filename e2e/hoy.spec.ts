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

test("«Con estas prendas» monta alrededor de varias y sugiere qué añadir", async ({ page }) => {
  await abreConArmario(page);
  await pestana(page, "Hoy");
  await page.getByRole("radiogroup", { name: "Modo" }).getByText("Con estas prendas").click();
  const elige = page.locator("#a-ancla-pick");
  await expect(elige).toContainText("Elige una o varias prendas");
  await elige.getByText("Blusa fluida azul grisáceo").click();
  await elige.getByText("Pantalón de pinzas marino").click();
  await expect(elige).toContainText(/Elegidas: .*Blusa fluida azul grisáceo.*Pantalón de pinzas marino/);
  const looks = page.locator("#a-out article.a-fit");
  await expect(looks.first()).toContainText("Con tus prendas");
  const ideas = page.locator("#a-ancla-ideas");
  await expect(ideas.getByRole("heading")).toContainText(/Lo que mejor le pega|No encuentro qué añadirle/);
  await expect(ideas.getByRole("button", { name: "Sí, la tengo" }).first()).toBeVisible();
  const antes = await ideas.locator(".a-ask b").first().textContent();
  await ideas.getByRole("button", { name: "No", exact: true }).first().click();
  await expect(ideas).toContainText("Apuntado: no tienes");
  expect(await ideas.locator(".a-ask b").first().textContent()).not.toBe(antes);
  await elige.getByRole("button", { name: "Quitar todas" }).click();
  await expect(elige).toContainText("Elige una o varias prendas");
  await expect(looks).toHaveCount(0);
  await elige.getByText("Vestido camisero lavanda").click();
  await elige.getByText("Blusa fluida azul grisáceo").click();
  await expect(elige).toContainText("Ojo: Vestido camisero lavanda se quita");
});

test("«Referencias» muestra tus looks de gusto y monta outfits desde Hoy", async ({ page }) => {
  await abreConArmario(page);
  await pestana(page, "Hoy");
  await page.getByRole("radiogroup", { name: "Modo" }).getByText("Referencias").click();
  const tarjeta = page.locator("#a-refs");
  await expect(tarjeta).toContainText("Sube capturas de looks que te gusten");
  await expect(tarjeta.getByText("Añadir referencias")).toBeVisible();
  await expect(page.locator("#a-prop-row")).toBeHidden();
  await tarjeta.getByRole("button", { name: "Looks como mis referencias" }).click();
  await expect(page.locator("#a-out article.a-fit").first()).toBeVisible();
});

test("«Pedir a la IA» no envía nada hasta aceptar el aviso", async ({ page }) => {
  const envios: string[] = [];
  await page.route("**/api/ia", async (route) => {
    envios.push(route.request().postData() || "");
    await route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ outfits: [] }) } }] } });
  });
  await abreConArmario(page);
  await pestana(page, "Hoy");
  await page.getByRole("button", { name: "Pedir a la IA" }).click();

  const permiso = page.getByRole("group", { name: "Permiso para enviar a la IA" });
  await expect(permiso).toContainText("Groq");
  await expect(permiso).toContainText("Mistral");
  await expect(permiso).toContainText("notas de los outfits que has votado");
  expect(envios).toHaveLength(0);
  await permiso.getByRole("button", { name: "No" }).click();
  await expect(permiso).toHaveCount(0);
  expect(envios).toHaveLength(0);

  await page.getByRole("button", { name: "Pedir a la IA" }).click();
  expect(envios).toHaveLength(0);
  await permiso.getByRole("button", { name: "Sí, enviarlos" }).click();
  await expect.poll(() => envios.length).toBe(1);
  expect(envios[0]).toContain("Su armario");
});
