import { test, expect } from "@playwright/test";
import { abreConArmario, pestana } from "./ayuda.ts";

test("marcar «La quiero» lo lleva a Mi lista y se puede quitar", async ({ page }) => {
  await abreConArmario(page);
  await pestana(page, "Deseos");
  const lista = page.locator("#w-list");
  const primera = lista.locator("li.w-item").first();
  const nombre = await primera.getByRole("heading").innerText();
  await primera.getByRole("button", { name: "La quiero" }).click();

  const filtro = page.locator("#w-filter");
  await expect(filtro).toContainText("Mi lista · 1");
  await filtro.getByText(/Mi lista/).click();
  const mia = lista.locator("li.w-item", { hasText: nombre });
  await expect(mia).toHaveCount(1);
  await mia.getByRole("button", { name: "En mi lista" }).click();
  await expect(page.getByText("Tu lista está vacía")).toBeVisible();
});

test("añadir una prenda propia pide nombre y la deja en Mi lista", async ({ page }) => {
  await abreConArmario(page);
  await pestana(page, "Deseos");
  const form = page.locator("#w-own");
  await form.getByRole("button", { name: "Añadir a mi lista" }).click();
  await expect(form).toContainText("Escribe qué prenda es.");

  await form.getByLabel("¿Has visto algo que no está aquí?").fill("Corsé de ante camel");
  await form.getByRole("button", { name: "Añadir a mi lista" }).click();
  await expect(form).toContainText("Añadida a tu lista.");
  const propia = page.locator("#w-list li.w-item", { hasText: "Corsé de ante camel" });
  await expect(propia).toContainText("Añadida por ti");

  await propia.getByRole("button", { name: "Quitar" }).click();
  await expect(page.locator("#w-list li.w-item")).toHaveCount(0);
});

test("el filtro cambia las prendas y los círculos de color cambian el tono", async ({ page }) => {
  await abreConArmario(page);
  await pestana(page, "Deseos");
  const lista = page.locator("#w-list");
  const antes = await lista.locator("li.w-item").count();
  await page.locator("#w-filter").getByText("Todo", { exact: true }).click();
  expect(await lista.locator("li.w-item").count()).toBeGreaterThanOrEqual(antes);

  const tarjeta = lista.locator("li.w-item").first();
  const tonos = tarjeta.locator(".w-sw button");
  if ((await tonos.count()) > 1) {
    await tonos.nth(1).click();
    await expect(tonos.nth(1)).toHaveAttribute("aria-pressed", "true");
    await expect(tonos.nth(0)).toHaveAttribute("aria-pressed", "false");
  }
});

test("«Ya la tengo» abre el formulario del armario con la prenda rellena", async ({ page }) => {
  await abreConArmario(page);
  await pestana(page, "Deseos");
  const primera = page.locator("#w-list li.w-item").first();
  const nombre = await primera.getByRole("heading").innerText();
  await primera.getByRole("button", { name: "Ya la tengo" }).click();
  await expect(page.locator("#tab-armario")).toBeVisible();
  await expect(page.locator("#tab-armario input[type=text]").first()).toHaveValue(nombre);
});
