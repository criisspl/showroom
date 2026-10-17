import { expect, type Page } from "@playwright/test";

/** Armario de prueba: perfil Verano Suave / Clásico Suave y 11 prendas inventadas. */
export const COPIA = "e2e/datos/armario-prueba.json";

/** Fija la fecha (martes de primavera) para que la ocasión y el tiempo por defecto no cambien según el día. */
export async function abre(page: Page) {
  await page.clock.setFixedTime(new Date("2026-04-14T10:00:00"));
  await page.goto("/");
}

/** Abre la app y carga el armario de prueba desde la bienvenida, como haría alguien con su copia. */
export async function abreConArmario(page: Page) {
  await abre(page);
  await page.locator("#b-importa").setInputFiles(COPIA);
  await expect(page.getByRole("navigation", { name: "Secciones" })).toBeVisible();
}

export const pestana = (page: Page, nombre: string) =>
  page
    .getByRole("navigation", { name: "Secciones" })
    .getByRole("button", { name: nombre, exact: true })
    .click();
