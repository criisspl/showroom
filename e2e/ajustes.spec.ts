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
  await expect(page.getByLabel(/^Tu clave/)).toBeHidden();

  await prov.selectOption({ label: "Groq" });
  await expect(page.locator("#s-prov-nota")).toContainText("muy rápido");
  await expect(page.getByLabel(/^Tu clave/)).toBeVisible();
  await expect(page.getByLabel("URL de la API")).toHaveValue(/^https:\/\//);

  await prov.selectOption({ label: "Otro compatible con OpenAI" });
  await expect(page.getByLabel("URL de la API")).toBeVisible();
});

test("guardar avisa si falta la clave y conserva lo guardado tras recargar sección", async ({ page }) => {
  await irAAjustes(page);
  await page.getByLabel("Qué IA usar").selectOption({ label: "Groq" });
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.locator("#s-msg")).toHaveText("Sin clave se usa la IA de la app.");

  await page.getByLabel(/^Tu clave/).fill("gsk_inventada");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.locator("#s-msg")).toHaveText("La contraseña necesita al menos 8 caracteres.");
  await page.getByLabel("Contraseña de tu clave").fill("contraseña-larga");
  await page.getByLabel("Modelo").fill("modelo-inventado");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.locator("#s-msg")).toHaveText("Guardado.");

  await pestana(page, "Hoy");
  await pestana(page, "Análisis");
  await page.getByRole("button", { name: "Ajustes" }).click();
  await expect(page.getByLabel("Qué IA usar")).toHaveValue("groq");
  await expect(page.getByLabel("Modelo")).toHaveValue("modelo-inventado");
});

test("la clave se guarda cifrada, queda bloqueada al recargar y se desbloquea con la contraseña", async ({
  page
}) => {
  await irAAjustes(page);
  await page.getByLabel("Qué IA usar").selectOption({ label: "Groq" });
  await page.getByLabel(/^Tu clave/).fill("gsk_inventada");
  await page.getByLabel("Contraseña de tu clave").fill("contraseña-larga");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.locator("#s-msg")).toHaveText("Guardado.");

  const guardado = await page.evaluate(
    () =>
      new Promise<string>((ok, ko) => {
        const abre = indexedDB.databases().then((dbs) => {
          const nombre = dbs[0]?.name;
          if (!nombre) return ko(new Error("sin base"));
          const r = indexedDB.open(nombre);
          r.onerror = () => ko(r.error);
          r.onsuccess = () => {
            const db = r.result;
            const volcado: unknown[] = [];
            const tx = db.transaction(Array.from(db.objectStoreNames), "readonly");
            for (const n of Array.from(db.objectStoreNames)) {
              const c = tx.objectStore(n).getAll();
              c.onsuccess = () => volcado.push(c.result);
            }
            tx.oncomplete = () => ok(JSON.stringify(volcado));
          };
        });
        void abre;
      })
  );
  expect(guardado).not.toContain("gsk_inventada");
  expect(guardado).toContain("envuelta");

  await page.reload();
  await pestana(page, "Análisis");
  await page.getByRole("button", { name: "Ajustes" }).click();
  await expect(page.getByText("Tu clave está guardada cifrada. Escribe tu contraseña")).toBeVisible();
  await page.getByLabel("Contraseña de tu clave").fill("otra-contraseña");
  await page.getByRole("button", { name: "Desbloquear" }).click();
  await expect(page.locator("#s-msg")).not.toHaveText("Clave desbloqueada en esta sesión.");
  await page.getByLabel("Contraseña de tu clave").fill("contraseña-larga");
  await page.getByRole("button", { name: "Desbloquear" }).click();
  await expect(page.locator("#s-msg")).toHaveText("Clave desbloqueada en esta sesión.");
});

test("una URL que no es https no se guarda", async ({ page }) => {
  await irAAjustes(page);
  await page.getByLabel("Qué IA usar").selectOption({ label: "Otro compatible con OpenAI" });
  await page.getByLabel("URL de la API").fill("http://inseguro.example/v1");
  await page.getByLabel(/^Tu clave/).fill("k");
  await page.getByLabel("Contraseña de tu clave").fill("contraseña-larga");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.locator("#s-msg")).toContainText("https://");
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

test("al cambiar de proveedor la clave guardada no se reutiliza en el nuevo destino", async ({ page }) => {
  await irAAjustes(page);
  await page.getByLabel("Qué IA usar").selectOption({ label: "Groq" });
  await page.getByLabel(/^Tu clave/).fill("gsk_inventada");
  await page.getByLabel("Contraseña de tu clave").fill("contraseña-larga");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.locator("#s-msg")).toHaveText("Guardado.");

  await page.getByLabel("Qué IA usar").selectOption({ label: "Mistral (Francia)" });
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.locator("#s-msg")).toHaveText("Sin clave se usa la IA de la app.");
  await expect(page.getByLabel(/^Tu clave/)).toBeVisible();
});

test("Ajustes avisa de que todavía no hay otro almacenamiento al que copiar los datos", async ({ page }) => {
  await irAAjustes(page);
  await expect(page.getByRole("heading", { name: "Copiar a otro almacenamiento" })).toBeVisible();
  await expect(page.locator("#s-migra")).toContainText("En este dispositivo (IndexedDB)");
  await expect(page.locator("#s-migra-nada")).toContainText("Todavía no hay otro almacenamiento disponible");
  await expect(page.getByRole("button", { name: "Copiar", exact: true })).toHaveCount(0);
});
